import std/[algorithm, json, os, sequtils, sets, strutils, tables, times]

const
  StateFilePath = "state.json"
  PostsRootPath = "src/posts"

proc nowIso(): string =
  format(getTime().utc, "yyyy-MM-dd'T'HH:mm:ss'Z'")

proc resolveStateFilePath(): string =
  let fromEnv = getEnv("DEVLOG_STATE_PATH", "").strip()
  if fromEnv.len > 0:
    return fromEnv
  StateFilePath

proc defaultState(): JsonNode =
  result = %*{
    "version": "1.0.0",
    "updated_at": nowIso(),
    "nodes": newJArray(),
    "edges": newJArray()
  }

proc ensureObject(node: var JsonNode, key: string) =
  if not node.hasKey(key) or node[key].kind != JObject:
    node[key] = newJObject()

proc ensureArray(node: var JsonNode, key: string) =
  if not node.hasKey(key) or node[key].kind != JArray:
    node[key] = newJArray()

proc loadState(filePath: string = StateFilePath): JsonNode =
  if not fileExists(filePath):
    return defaultState()
  try:
    result = parseJson(readFile(filePath))
  except CatchableError:
    result = defaultState()

  if result.kind != JObject:
    result = defaultState()

  ensureArray(result, "nodes")
  ensureArray(result, "edges")
  if not result.hasKey("version"):
    result["version"] = %"1.0.0"
  result["updated_at"] = %nowIso()

proc saveState(state: JsonNode, filePath: string = StateFilePath) =
  writeFile(filePath, pretty(state))

proc normalizePath(inputPath: string): string =
  inputPath.replace("\\", "/")

proc postIdFromPath(postPath: string): string =
  let normalized = normalizePath(postPath)
  let parts = normalized.split("/")
  if parts.len >= 4 and parts[0] == "src" and parts[1] == "posts":
    let locale = if parts[2] == "ko": "ko" else: "en"
    let categoryIndex = if locale == "ko": 3 else: 2
    let category = if parts.len > categoryIndex: parts[categoryIndex] else: "misc"
    let slug = parts[^1].replace(".md", "")
    return "post:" & locale & ":" & category & ":" & slug
  "post:en:misc:" & normalized.replace("/", ":").replace(".md", "")

proc scanPostFiles(postsRoot: string = PostsRootPath): seq[string] =
  if not dirExists(postsRoot):
    return @[]
  for filePath in walkDirRec(postsRoot):
    if filePath.endsWith(".md"):
      result.add(normalizePath(filePath))

proc makeDefaultPostNode(postPath: string): JsonNode =
  let now = nowIso()
  let parts = normalizePath(postPath).split("/")
  let locale = if parts.len > 2 and parts[2] == "ko": "ko" else: "en"
  let categoryIndex = if locale == "ko": 3 else: 2
  let category = if parts.len > categoryIndex: parts[categoryIndex] else: "misc"
  let title = parts[^1].replace(".md", "")
  result = %*{
    "id": postIdFromPath(postPath),
    "path": normalizePath(postPath),
    "kind": "post",
    "status": "draft",
    "timestamps": {
      "created_at": now,
      "updated_at": now,
      "published_at": newJNull()
    },
    "integrity": {
      "requires": newJArray(),
      "dependencies_satisfied": true,
      "last_checked_at": now
    },
    "channels": {
      "blog": "pending",
      "x": "pending",
      "linkedin": "pending",
      "devto": "pending"
    },
    "meta": {
      "title": title,
      "locale": locale,
      "category": category
    }
  }

proc findNodeIndexById(state: JsonNode, nodeId: string): int =
  if not state.hasKey("nodes") or state["nodes"].kind != JArray:
    return -1
  for idx in 0 ..< state["nodes"].len:
    let node = state["nodes"][idx]
    if node.kind == JObject and node.hasKey("id") and node["id"].getStr("") == nodeId:
      return idx
  -1

proc syncState(state: var JsonNode, postsRoot: string = PostsRootPath): JsonNode =
  ensureArray(state, "nodes")
  var nodes = state["nodes"]
  var pathToIndex = initTable[string, int]()

  for idx in 0 ..< nodes.len:
    let node = nodes[idx]
    if node.kind == JObject and node.hasKey("kind") and node["kind"].getStr("") == "post":
      let nodePath = normalizePath(node["path"].getStr(""))
      if nodePath.len > 0:
        pathToIndex[nodePath] = idx

  let files = scanPostFiles(postsRoot)
  var seenPaths = initHashSet[string]()
  var created = 0
  var updated = 0

  for postPath in files:
    let normalizedPath = normalizePath(postPath)
    seenPaths.incl(normalizedPath)
    if pathToIndex.hasKey(normalizedPath):
      let idx = pathToIndex[normalizedPath]
      var node = nodes[idx]
      node["id"] = %postIdFromPath(normalizedPath)
      node["path"] = %normalizedPath
      if not node.hasKey("kind"):
        node["kind"] = %"post"
      if not node.hasKey("status"):
        node["status"] = %"draft"
      ensureObject(node, "timestamps")
      var timestamps = node["timestamps"]
      if not timestamps.hasKey("created_at"):
        timestamps["created_at"] = %nowIso()
      timestamps["updated_at"] = %nowIso()
      if not timestamps.hasKey("published_at"):
        timestamps["published_at"] = newJNull()
      ensureObject(node, "integrity")
      ensureObject(node, "channels")
      ensureObject(node, "meta")
      nodes.elems[idx] = node
      inc(updated)
    else:
      nodes.add(makeDefaultPostNode(normalizedPath))
      inc(created)

  var missing = 0
  for idx in 0 ..< nodes.len:
    var node = nodes[idx]
    if node.kind != JObject:
      continue
    if node.getOrDefault("kind").getStr("") != "post":
      continue
    let nodePath = normalizePath(node.getOrDefault("path").getStr(""))
    if nodePath.len == 0 or not seenPaths.contains(nodePath):
      if node.getOrDefault("status").getStr("") != "missing":
        node["status"] = %"missing"
      inc(missing)
    else:
      if node.getOrDefault("status").getStr("") == "missing":
        node["status"] = %"draft"
    nodes.elems[idx] = node

  state["updated_at"] = %nowIso()
  result = %*{
    "command": "sync",
    "created_nodes": created,
    "updated_nodes": updated,
    "missing_nodes": missing,
    "total_nodes": nodes.len
  }

proc checkPublishDependencies(state: JsonNode, node: JsonNode): tuple[satisfied: bool, missing: seq[string], unpublished: seq[string]] =
  var missing: seq[string] = @[]
  var unpublished: seq[string] = @[]

  if not node.hasKey("integrity") or node["integrity"].kind != JObject:
    return (true, missing, unpublished)
  if not node["integrity"].hasKey("requires") or node["integrity"]["requires"].kind != JArray:
    return (true, missing, unpublished)

  for reqNode in node["integrity"]["requires"].items:
    let reqId = reqNode.getStr("")
    if reqId.len == 0:
      continue
    let reqIndex = findNodeIndexById(state, reqId)
    if reqIndex < 0:
      missing.add(reqId)
      continue
    let status = state["nodes"][reqIndex].getOrDefault("status").getStr("")
    if status != "published":
      unpublished.add(reqId)

  (missing.len == 0 and unpublished.len == 0, missing, unpublished)

proc parsePlatforms(csv: string): seq[string] =
  let defaults = @["x", "linkedin", "devto"]
  if csv.strip().len == 0:
    return defaults

  var unique = initHashSet[string]()
  for platform in csv.split(","):
    let normalized = platform.strip().toLowerAscii()
    if normalized.len > 0:
      unique.incl(normalized)
  if unique.len == 0:
    return defaults
  result = toSeq(unique.items)
  result.sort()

proc authEnvName(platform: string): string =
  case platform
  of "x":
    "X_API_KEY"
  of "linkedin":
    "LINKEDIN_ACCESS_TOKEN"
  of "devto":
    "DEVTO_API_KEY"
  else:
    ""

proc buildMockDelivery(platform: string): JsonNode =
  let envName = authEnvName(platform)
  let hasSecret = envName.len > 0 and getEnv(envName, "").strip().len > 0
  %*{
    "platform": platform,
    "result": "mock_success",
    "api_called": false,
    "auth_env": envName,
    "auth_configured": hasSecret,
    "published_at": nowIso()
  }

proc buildAuthContext(platforms: seq[string]): JsonNode =
  result = newJObject()
  for platform in platforms:
    let envName = authEnvName(platform)
    let hasSecret = envName.len > 0 and getEnv(envName, "").strip().len > 0
    result[platform] = %*{
      "env": envName,
      "configured": hasSecret
    }

proc publishNode(state: var JsonNode, nodeId: string, requestedPlatforms: seq[string]): JsonNode =
  let nodeIndex = findNodeIndexById(state, nodeId)
  if nodeIndex < 0:
    return %*{
      "command": "publish",
      "node_id": nodeId,
      "result": "not_found"
    }

  var nodes = state["nodes"]
  var node = nodes[nodeIndex]
  let dependencyResult = checkPublishDependencies(state, node)
  ensureObject(node, "integrity")
  var integrity = node["integrity"]
  integrity["dependencies_satisfied"] = %dependencyResult.satisfied
  integrity["last_checked_at"] = %nowIso()
  if dependencyResult.satisfied == false:
    nodes.elems[nodeIndex] = node
    state["nodes"] = nodes
    state["updated_at"] = %nowIso()
    return %*{
      "command": "publish",
      "node_id": nodeId,
      "result": "blocked",
      "missing_dependencies": dependencyResult.missing,
      "unpublished_dependencies": dependencyResult.unpublished
    }

  if node.getOrDefault("status").getStr("") == "published":
    nodes.elems[nodeIndex] = node
    state["nodes"] = nodes
    state["updated_at"] = %nowIso()
    let platforms = if requestedPlatforms.len == 0: @["x", "linkedin", "devto"] else: requestedPlatforms
    return %*{
      "command": "publish",
      "node_id": nodeId,
      "result": "already_published",
      "platforms": platforms,
      "api_called": false,
      "auth_context": buildAuthContext(platforms)
    }

  node["status"] = %"published"
  ensureObject(node, "timestamps")
  var timestamps = node["timestamps"]
  if not timestamps.hasKey("created_at"):
    timestamps["created_at"] = %nowIso()
  timestamps["updated_at"] = %nowIso()
  timestamps["published_at"] = %nowIso()

  ensureObject(node, "channels")
  var channels = node["channels"]
  channels["blog"] = %"published"

  let platforms = if requestedPlatforms.len == 0: @["x", "linkedin", "devto"] else: requestedPlatforms
  ensureObject(node, "deliveries")
  var deliveries = node["deliveries"]
  var deliveryLog = newJArray()
  for platform in platforms:
    let delivery = buildMockDelivery(platform)
    channels[platform] = %"published"
    deliveries[platform] = delivery
    deliveryLog.add(delivery)

  nodes.elems[nodeIndex] = node
  state["nodes"] = nodes
  state["updated_at"] = %nowIso()

  %*{
    "command": "publish",
    "node_id": nodeId,
    "result": "published",
    "platforms": platforms,
    "auth_context": buildAuthContext(platforms),
    "delivery_log": deliveryLog
  }

proc buildGraphPayload(state: JsonNode): JsonNode =
  var compactNodes = newJArray()
  var compactEdges = newJArray()

  for node in state.getOrDefault("nodes").items:
    compactNodes.add(%*{
      "id": node.getOrDefault("id").getStr(""),
      "kind": node.getOrDefault("kind").getStr(""),
      "status": node.getOrDefault("status").getStr(""),
      "path": node.getOrDefault("path").getStr("")
    })

  for edge in state.getOrDefault("edges").items:
    compactEdges.add(%*{
      "id": edge.getOrDefault("id").getStr(""),
      "from": edge.getOrDefault("from").getStr(""),
      "to": edge.getOrDefault("to").getStr(""),
      "relation": edge.getOrDefault("relation").getStr(""),
      "status": edge.getOrDefault("status").getStr("")
    })

  %*{
    "command": "graph",
    "generated_at": nowIso(),
    "node_count": compactNodes.len,
    "edge_count": compactEdges.len,
    "nodes": compactNodes,
    "edges": compactEdges
  }

proc buildDotGraph(state: JsonNode): string =
  var lines = @["digraph ThoughtTrajectory {"]
  lines.add("  rankdir=LR;")

  for node in state.getOrDefault("nodes").items:
    let id = node.getOrDefault("id").getStr("").replace("\"", "\\\"")
    let kind = node.getOrDefault("kind").getStr("").replace("\"", "\\\"")
    let status = node.getOrDefault("status").getStr("").replace("\"", "\\\"")
    let label = id & "\\n" & kind & ":" & status
    lines.add("  \"" & id & "\" [label=\"" & label & "\"];")

  for edge in state.getOrDefault("edges").items:
    let source = edge.getOrDefault("from").getStr("").replace("\"", "\\\"")
    let target = edge.getOrDefault("to").getStr("").replace("\"", "\\\"")
    let relation = edge.getOrDefault("relation").getStr("").replace("\"", "\\\"")
    lines.add("  \"" & source & "\" -> \"" & target & "\" [label=\"" & relation & "\"];")

  lines.add("}")
  lines.join("\n")

proc runSync() =
  let stateFilePath = resolveStateFilePath()
  var state = loadState(stateFilePath)
  let summary = syncState(state)
  saveState(state, stateFilePath)
  echo pretty(summary)

proc runPublish(nodeId: string, platformsCsv: string) =
  let stateFilePath = resolveStateFilePath()
  var state = loadState(stateFilePath)
  let result = publishNode(state, nodeId, parsePlatforms(platformsCsv))
  saveState(state, stateFilePath)
  echo pretty(result)
  let status = result.getOrDefault("result").getStr("")
  if status == "not_found":
    quit(2)
  if status == "blocked":
    quit(3)

proc runGraph(formatArg: string) =
  let state = loadState(resolveStateFilePath())
  let normalizedFormat = formatArg.strip().toLowerAscii()
  if normalizedFormat == "dot":
    echo buildDotGraph(state)
    return

  let payload = buildGraphPayload(state)
  payload["dot"] = %buildDotGraph(state)
  echo pretty(payload)

proc printUsage() =
  echo "Usage:"
  echo "  devlog sync"
  echo "  devlog publish <id> [platforms_csv]"
  echo "  devlog graph [json|dot]"

proc main() =
  let args = commandLineParams()
  if args.len == 0:
    printUsage()
    quit(1)

  let command = args[0].toLowerAscii()
  if command == "sync":
    runSync()
    return
  if command == "publish":
    if args.len < 2:
      printUsage()
      quit(1)
    let nodeId = args[1]
    let platformsCsv = if args.len >= 3: args[2] else: ""
    runPublish(nodeId, platformsCsv)
    return
  if command == "graph":
    let formatArg = if args.len >= 2: args[1] else: "json"
    runGraph(formatArg)
    return

  printUsage()
  quit(1)

when isMainModule:
  main()

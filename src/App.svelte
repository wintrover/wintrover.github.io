<script lang="ts">
import { onDestroy, onMount } from "svelte";
import Router from "svelte-spa-router";
import BlogList from "./components/BlogList.svelte";
import Footer from "./components/Footer.svelte";
import PostDetail from "./components/PostDetail.svelte";
import ResumePage from "./components/ResumePage.svelte";
import Sidebar from "./components/Sidebar.svelte";
import HomePage from "./routes/+page.svelte";
import { posts } from "./stores/posts";

let innerWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
let sidebarCollapsed = false;
let sidebarElement: HTMLElement | null = null;
let mainContentElement: HTMLElement | null = null;
let contentElement: HTMLElement | null = null;
let manualToggle = false;
let resizeTimeout: any = null;

const routes = {
	"/": HomePage,
	"/category/:category": BlogList,
	"/category/:category/tag/:tag": BlogList,
	"/post/:slug": PostDetail,
	"/resume": ResumePage,
	"/resume/": ResumePage,
	"/resume/*": ResumePage,
};

$: {
	if (typeof document !== "undefined") {
		if (sidebarCollapsed) {
			document.body.classList.add("sidebar-collapsed");
		} else {
			document.body.classList.remove("sidebar-collapsed");
		}
	}
}

let checkTimeout: any = null;

function checkSidebarCollision() {
	if (innerWidth < 768) {
		if (!sidebarCollapsed) {
			sidebarCollapsed = true;
		}
		return;
	}

	if (!sidebarElement || !contentElement) {
		return;
	}

	if (manualToggle) {
		return;
	}

	const sidebarRect = sidebarElement.getBoundingClientRect();
	const contentRect = contentElement
		? contentElement.getBoundingClientRect()
		: ({ width: 0, left: 0, right: 0 } as DOMRect);

	if (sidebarRect.width === 0 || contentRect.width === 0) {
		if (sidebarCollapsed) {
			sidebarCollapsed = false;
		}
		return;
	}

	if (innerWidth >= 1200 && !manualToggle) {
		if (sidebarCollapsed && contentRect.left > 120) {
			sidebarCollapsed = false;
		}
		return;
	}

	const isOverlapping = sidebarRect.right >= contentRect.left;

	if (isOverlapping && !sidebarCollapsed) {
		sidebarCollapsed = true;
	} else if (contentRect.left > 120 && sidebarCollapsed && !manualToggle) {
		sidebarCollapsed = false;
	}
}

function debouncedCheckSidebarCollision() {
	if (checkTimeout) {
		clearTimeout(checkTimeout);
	}
	checkTimeout = setTimeout(checkSidebarCollision, 10);
}

function handleResize() {
	manualToggle = false;
	checkSidebarCollision();
}

function toggleSidebar() {
	manualToggle = true;
	sidebarCollapsed = !sidebarCollapsed;
}

let resizeObserver: ResizeObserver | null = null;
let handleToggleSidebar: (() => void) | null = null;

// Reactive initialization for side effects that depend on browser globals
$: if (
	typeof window !== "undefined" &&
	typeof document !== "undefined" &&
	!handleToggleSidebar
) {
	handleToggleSidebar = () => {
		sidebarCollapsed = !sidebarCollapsed;
		manualToggle = true;
	};
	document.addEventListener("toggle-sidebar", handleToggleSidebar);

	resizeObserver = new ResizeObserver(() => {
		debouncedCheckSidebarCollision();
	});

	// Cleanup on destroy
	// In Svelte 4, onDestroy is the way to clean up manual listeners
}

// React to elements becoming available via bind:this
let observingSidebar = false;
$: if (resizeObserver && sidebarElement && !observingSidebar) {
	resizeObserver.observe(sidebarElement);
	observingSidebar = true;
}

let observingMain = false;
$: if (resizeObserver && mainContentElement && !observingMain) {
	resizeObserver.observe(mainContentElement);
	observingMain = true;
}

// Initial check when everything is ready
$: if (
	resizeObserver &&
	(innerWidth < 768 || (sidebarElement && contentElement))
) {
	checkSidebarCollision();
}

// Reactive check on innerWidth change (bound via <svelte:window>)
$: if (innerWidth) {
	checkSidebarCollision();
}

onDestroy(() => {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	if (handleToggleSidebar) {
		document.removeEventListener("toggle-sidebar", handleToggleSidebar);
	}
	resizeObserver?.disconnect();
	if (checkTimeout) clearTimeout(checkTimeout);
});
</script>

<svelte:window bind:innerWidth on:resize={handleResize} />

<div id="app-container" class:sidebar-collapsed={sidebarCollapsed}>
  <button class="sidebar-toggle" on:click={toggleSidebar} aria-label="Toggle Sidebar">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <aside id="sidebar" class:collapsed={sidebarCollapsed} bind:this={sidebarElement} data-testid="sidebar">
    <Sidebar />
  </aside>

  <main id="main-content" bind:this={mainContentElement}>
    <div id="content" bind:this={contentElement} data-testid="content">
      {#await $posts}
        <p>Loading posts...</p>
      {:then}
        <Router {routes} />
      {:catch error}
        <p>Error loading posts: {error.message}</p>
      {/await}
    </div>
    <Footer />
  </main>
</div>

<style>
  :global(body) {
    font-family:
      "Geist Sans",
      "Pretendard",
      "Inter",
      -apple-system,
      blinkmacsystemfont,
      "Segoe UI",
      sans-serif;
    margin: 0;
    padding: 0;
    background-color: #09090b;
    color: #a1a1aa;
  }

  #app-container {
    display: flex;
    min-height: 100vh;
    transition: all 0.01s ease;
  }

  #sidebar {
    width: 248px;
    background: #09090b;
    border-right: 1px solid rgb(39 39 42 / 85%);
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    padding: 0;
    box-sizing: border-box;
    transform: translateX(0);
    transition: transform 0.01s ease;
    z-index: 1000;
  }

  :global(#sidebar::-webkit-scrollbar) {
    display: none;
  }

  #sidebar.collapsed {
    transform: translateX(-100%);
  }

  #main-content {
    flex: 1;
    margin-left: 288px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    transition: margin-left 0.01s ease;
  }

  #content {
    flex: 1;
    max-width: 920px;
    margin: 0 auto 44px;
    padding: 0 24px;
    width: 100%;
  }

  .sidebar-collapsed #main-content {
    margin-left: 0;
  }

  @media (max-width: 480px) {
    #content {
      margin: 0 0 20px;
      padding: 0 15px;
    }
  }

  .sidebar-toggle {
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 1002;
    background: rgb(24 24 27 / 86%);
    color: #fafafa;
    border: 1px solid rgb(63 63 70 / 80%);
    border-radius: 0.7rem;
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 8px 28px rgb(0 0 0 / 30%);
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .sidebar-toggle:hover {
    background: rgb(39 39 42 / 90%);
    border-color: rgb(82 82 91);
  }

  @media (max-width: 768px) {
    .sidebar-toggle {
      top: 10px;
      left: 10px;
      width: 36px;
      height: 36px;
    }
  }

  @media (max-width: 480px) {
    .sidebar-toggle {
      top: 8px;
      left: 8px;
      width: 32px;
      height: 32px;
    }
  }
</style>

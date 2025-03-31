source "https://rubygems.org"

gem "jekyll", "~> 4.3.2"

# Jekyll 플러그인
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.17.0"
  gem "jekyll-seo-tag", "~> 2.8.0"
end

# Windows와 JRuby는 이벤트 머신 의존성이 필요
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# HTTP 서버 의존성
gem "webrick", "~> 1.8" 
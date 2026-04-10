// https://www.chromium.org/updates/ua-reduction/#token-reference
const WINDOWS = 'Windows NT 10.0; Win64; x64'
const MACOS = 'Macintosh; Intel Mac OS X 10_15_7' // arch independent
const LINUX = 'X11; Linux x86_64'

// https://bugzilla.mozilla.org/show_bug.cgi?id=1789310
const UBUNTU_PLATFORM = 'X11; Ubuntu; Linux x86_64' // ubuntu for FF

const dropMinor = (versionString) => versionString.split(".").slice(0, 2).join(".")
const onlyMajor = (versionString) => versionString.split(".")[0]

// format https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/User-Agent/Firefox
const makeFirefoxUA = (platform, versionString) => `Mozilla/5.0 (${platform}; rv:${versionString}) Gecko/20100101 Firefox/${versionString}`

// format https://www.chromium.org/updates/ua-reduction/
const makeChromeUA = (platform, versionString) => `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versionString}.0.0.0 Safari/537.36`

// 605.1.5 seems to be semi-frozen
const makeSafariUA = (versionString) => `Mozilla/5.0 (${MACOS}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${versionString} Safari/605.1.15`

// https://blogs.windows.com/msedgedev/2015/06/17/building-a-more-interoperable-web-with-microsoft-edge/
// had to be truncated to Edg/
const makeEdgeUA = (platform, versionString) => `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${onlyMajor(versionString)}.0.0.0 Safari/537.36 Edg/${versionString}`

const getFirefoxVersion = () =>
  fetch('https://product-details.mozilla.org/1.0/firefox_versions.json')
    .then(res => res.json())
    .then(data => ({
      "latest": dropMinor(data.LATEST_FIREFOX_VERSION),
      "esr": dropMinor(data.FIREFOX_ESR)
    }))

// calculate last major by hand
// api https://developer.chrome.com/docs/web-platform/versionhistory/guide
const getChromeVersion = () =>
  fetch("https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions")
    .then(res => res.json())
    .then(data => data.versions)
    .then(versions => versions[0].version) // latest stable
    .then(onlyMajor) // drop minor/patch for better longevity

// https://github.com/mdn/browser-compat-data/blob/main/browsers/safari.json
// https://developer.apple.com/tutorials/data/documentation/safari-release-notes.json
// beta/stable not available directly from apple, scrape from third-party
const getSafariVersion = () =>
  fetch("https://raw.githubusercontent.com/mdn/browser-compat-data/refs/heads/main/browsers/safari.json")
    .then(res => res.json())
    .then(data => data.browsers.safari.releases)
    .then(releases => Object.entries(releases).find(release => release[1].status === "current")[0])

// https://edgeupdates.microsoft.com/api/products
const getEdgeVersion = () =>
  fetch("https://edgeupdates.microsoft.com/api/products")
    .then(res => res.json())
    .then(data => data[0].Releases)
    .then(releases => releases.find(release => release.Platform == "Windows").ProductVersion)

// construct final array
const getUserAgents = async () => {
  const firefoxVersions = await getFirefoxVersion()
  const chromeVersion = await getChromeVersion()
  const safariVersion = await getSafariVersion()
  const lastChromeVersion = Number(chromeVersion) - 1
  const edgeVersion = await getEdgeVersion()
  
  // mirror jnrbsn/user-agents list order
  return [
    makeChromeUA(MACOS, lastChromeVersion),
    makeChromeUA(MACOS, chromeVersion),
    makeChromeUA(WINDOWS, lastChromeVersion),
    makeChromeUA(WINDOWS, chromeVersion),
    makeChromeUA(LINUX, lastChromeVersion),
    makeChromeUA(LINUX, chromeVersion),
    makeFirefoxUA(MACOS, firefoxVersions.esr),
    makeFirefoxUA(MACOS, firefoxVersions.latest),
    makeFirefoxUA(WINDOWS, firefoxVersions.esr),
    makeFirefoxUA(WINDOWS, firefoxVersions.latest),
    makeFirefoxUA(LINUX, firefoxVersions.esr),
    makeFirefoxUA(LINUX, firefoxVersions.latest),
    makeFirefoxUA(UBUNTU_PLATFORM, firefoxVersions.esr),
    makeFirefoxUA(UBUNTU_PLATFORM, firefoxVersions.latest),
    makeSafariUA(safariVersion),
    makeEdgeUA(WINDOWS, edgeVersion)
  ]
}

const userAgents = await getUserAgents()
// panic if length is not 16
if (userAgents.length !== 16) {
  throw new Error("Unexpected number of user agents generated")
}
const stringified = JSON.stringify(userAgents, null, 2)
console.log(stringified)
Deno.writeTextFile("user-agents.json", stringified)
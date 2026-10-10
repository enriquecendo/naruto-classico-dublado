// Naruto clássico — Dattebane (live)
// Prefere FHD normal; fallback para FHD MQ.
// Tudo no name (único campo que o Nuvio mostra)

var SOURCE_PAGE = "https://www.dattebane.com/pagina/Naruto%20Dublado%20HBO%20Download%20Lista%20Links";

var CACHE = {
  html: null,
  timestamp: 0,
  TTL: 90 * 1000
};

function toAbsoluteEpisode(season, episode) {
  var s = Number(season);
  var e = Number(episode);
  if (!isFinite(s) || !isFinite(e) || e < 1) return null;

  if (s === 1) return e;
  if (s === 2) return 35 + e;
  if (s === 3) return 83 + e;
  if (s === 4) return 131 + e;
  if (s === 5) return 179 + e;
  return null;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#x2F;/g, "/")
    .replace(/\\\//g, "/")
    .replace(/https\\:\/\//gi, "https://");
}

function extractEpisodeNumber(url) {
  var decoded = url;
  try { decoded = decodeURIComponent(url); } catch (_) {}
  var patterns = [
    /Epis[oó]dio[\s_\-]*0*(\d{1,3})\b/i,
    /episode[\s_\-]*0*(\d{1,3})\b/i,
    /ep[\s_\-]*0*(\d{1,3})\b/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = decoded.match(patterns[i]);
    if (m) return Number(m[1]);
  }
  return null;
}

function findEpisodeUrl(html, targetEpisode) {
  html = normalizeText(html);
  var regex = /https?:\/\/s\d+\.dattebane\.com\/download\/[^\n<\"']+?\.mp4/gi;
  var match;

  var fhdClean = null;
  var fhdMQ = null;

  while ((match = regex.exec(html)) !== null) {
    var url = match[0].trim();
    var ep = extractEpisodeNumber(url);
    if (ep !== targetEpisode) continue;

    if (/FHD\.mp4$/i.test(url) && !/MQ/i.test(url)) {
      fhdClean = url;
    } else if (/FHD\s*MQ\.mp4$/i.test(url) || /MQ\.mp4$/i.test(url)) {
      fhdMQ = url;
    }
  }

  var chosen = fhdClean || fhdMQ;
  if (!chosen) return null;
  return chosen.replace(/ /g, "%20");
}

function getPageHtml() {
  var now = Date.now();
  if (CACHE.html && (now - CACHE.timestamp) < CACHE.TTL) {
    return Promise.resolve(CACHE.html);
  }

  return fetch(SOURCE_PAGE, {
    method: "GET",
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.dattebane.com/",
      "Cookie": "ServerOption=NOTFIX",
      "Sec-Ch-Ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": "\"Windows\"",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    }
  })
    .then(function (response) {
      if (!response || !response.ok) {
        throw new Error("Status " + (response ? response.status : "desconhecido"));
      }
      return response.text();
    })
    .then(function (html) {
      if (!html || html.indexOf("dattebane.com/download") === -1) {
        throw new Error("Página veio sem links (provável bloqueio)");
      }
      CACHE.html = html;
      CACHE.timestamp = Date.now();
      return html;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== "tv") {
    return Promise.resolve([]);
  }

  var id = String(tmdbId || "").trim().toLowerCase();
  var ep = Number(episode);
  var sn = Number(season);
  var absoluteEp = null;
  var labelSeason = null;
  var labelEpisode = null;

  // Kitsu
  var kitsuMatch = id.match(/^kitsu:11(?::(\d{1,3}))?$/);
  if (kitsuMatch) {
    absoluteEp = ep;
    if (kitsuMatch[1] && Number(kitsuMatch[1]) !== ep) {
      return Promise.resolve([]);
    }
    labelSeason = 1;
    labelEpisode = ep;
  }

  // Cinemeta
  if (!absoluteEp && isFinite(sn) && isFinite(ep)) {
    absoluteEp = toAbsoluteEpisode(sn, ep);
    labelSeason = sn;
    labelEpisode = ep;
  }

  if (!absoluteEp || absoluteEp < 1 || absoluteEp > 220) {
    return Promise.resolve([]);
  }

  return getPageHtml()
    .then(function (html) {
      var url = findEpisodeUrl(html, absoluteEp);
      if (!url) {
        console.log("[Naruto Dattebane] Não achei episódio absoluto " + absoluteEp);
        return [];
      }

      var seasonStr = String(labelSeason).padStart(2, "0");
      var epStr = String(labelEpisode).padStart(2, "0");
      var absStr = String(absoluteEp).padStart(3, "0");

      var isMQ = /MQ/i.test(url);
      var qualityLabel = isMQ ? "FHD MQ" : "FHD";

      return [{
        name: "🍥 Dattebane • " + qualityLabel + "\n🎬 T" + seasonStr + " E" + epStr + " (Ep. " + absStr + ")\n🌏 Dublado PT-BR\n😁👍 hehe to certo",
        title: "Naruto Clássico",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.dattebane.com/"
        }
      }];
    })
    .catch(function (error) {
      console.log("[Naruto Dattebane] Falha: " + String(error && error.message || error));
      return [];
    });
}

module.exports = { getStreams: getStreams };

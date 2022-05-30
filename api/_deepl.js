'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var _got = require('got');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var _got__default = /*#__PURE__*/_interopDefaultLegacy(_got);

function extractTranslatedSentences(response) {
  return response.result.translations.reduce((sentences, translation) => {
    sentences.push(translation.beams[0].postprocessed_sentence);
    return sentences;
  }, []);
}
function extractSplitSentences(response) {
  return response.result.splitted_texts[0];
}

function calculateValidTimestamp(timestamp, iCount) {
  return iCount ? timestamp + (iCount - timestamp % iCount) : timestamp;
}
function count(sentence, part) {
  return sentence.split(part).length - 1;
}
function generateTimestamp(sentences) {
  const now = Date.now();
  let iCount = 1;
  for (const sentence of sentences) {
    iCount += count(sentence, "i");
  }
  return calculateValidTimestamp(now, iCount);
}
function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateId() {
  const MIN = 1e6;
  const MAX = 1e8;
  return randRange(MIN, MAX);
}

const API_URL = "https://www2.deepl.com/jsonrpc";
const AUTO = "auto";
const SUPPORTED_LANGUAGES = [
  { code: "BG", language: "Bulgarian" },
  { code: "ZH", language: "Chinese" },
  { code: "CS", language: "Czech" },
  { code: "DA", language: "Danish" },
  { code: "NL", language: "Dutch" },
  { code: "EN", language: "English" },
  { code: "ET", language: "Estonian" },
  { code: "FI", language: "Finnish" },
  { code: "FR", language: "French" },
  { code: "DE", language: "German" },
  { code: "EL", language: "Greek" },
  { code: "HU", language: "Hungarian" },
  { code: "IT", language: "Italian" },
  { code: "JA", language: "Japanese" },
  { code: "LV", language: "Latvian" },
  { code: "LT", language: "Lithuanian" },
  { code: "PL", language: "Polish" },
  { code: "PT", language: "Portuguese" },
  { code: "RO", language: "Romanian" },
  { code: "RU", language: "Russian" },
  { code: "SK", language: "Slovak" },
  { code: "SL", language: "Slovenian" },
  { code: "ES", language: "Spanish" },
  { code: "SV", language: "Swedish" }
];
const SUPPORTED_FORMALITY_TONES = ["formal", "informal"];

function generateSplitSentencesRequestData(text, sourceLanguage = AUTO, identifier = generateId()) {
  return {
    jsonrpc: "2.0",
    method: "LMT_split_into_sentences",
    params: {
      lang: {
        lang_user_selected: sourceLanguage,
        user_preferred_langs: []
      },
      texts: [text]
    },
    id: identifier
  };
}
function generateJobs(sentences, beams = 1) {
  return sentences.reduce((jobs, sentence, idx) => {
    jobs.push({
      kind: "default",
      raw_en_sentence: sentence,
      raw_en_context_before: sentences.slice(0, idx),
      raw_en_context_after: idx + 1 < sentences.length ? [sentences[idx + 1]] : [],
      preferred_num_beams: beams
    });
    return jobs;
  }, []);
}
function generateCommonJobParams(formality) {
  if (!formality) {
    return {};
  }
  if (!SUPPORTED_FORMALITY_TONES.includes(formality)) {
    throw new Error("Formality tone '{formality_tone}' not supported.");
  }
  return { formality };
}
function generateTranslationRequestData(sourceLanguage, targetLanguage, sentences, identifier = generateId(), alternatives = 1, formality) {
  return {
    jsonrpc: "2.0",
    method: "LMT_handle_jobs",
    params: {
      jobs: generateJobs(sentences, alternatives),
      lang: {
        user_preferred_langs: [targetLanguage, sourceLanguage],
        source_lang_computed: sourceLanguage,
        target_lang: targetLanguage
      },
      priority: 1,
      commonJobParams: generateCommonJobParams(formality),
      timestamp: generateTimestamp(sentences)
    },
    id: identifier
  };
}

function createAbbreviationsDictionary(languages = SUPPORTED_LANGUAGES) {
  return languages.reduce((acc, lang) => {
    acc[lang.code.toLowerCase()] = lang.code;
    acc[lang.language.toLowerCase()] = lang.code;
    return acc;
  }, {});
}
function abbreviateLanguage(language) {
  return createAbbreviationsDictionary()[language.toLowerCase()];
}

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const got = _got__default["default"].extend({
  headers: {
    accept: "*/*",
    "accept-language": "en-US;q=0.8,en;q=0.7",
    authority: "www2.deepl.com",
    "content-type": "application/json",
    origin: "https://www.deepl.com",
    referer: "https://www.deepl.com/translator",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Mobile Safari/537.36"
  },
  stringifyJson(object) {
    return JSON.stringify(object).replace('"method":"', () => {
      const self = object;
      if ((self.id + 3) % 13 === 0 || (self.id + 5) % 29 === 0) {
        return '"method" : "';
      }
      return '"method": "';
    });
  }
});
function splitSentences(text, sourceLanguage, identifier) {
  return __async(this, null, function* () {
    const data = generateSplitSentencesRequestData(text, sourceLanguage, identifier);
    return yield got.post(API_URL, {
      json: data
    }).json();
  });
}
function splitIntoSentences(text, sourceLanguage, identifier) {
  return __async(this, null, function* () {
    return extractSplitSentences(yield splitSentences(text, sourceLanguage, identifier));
  });
}
function requestTranslation(text, targetLanguage, sourceLanguage, identifier, alternatives, formalityTone) {
  return __async(this, null, function* () {
    const res = yield splitSentences(text, sourceLanguage, identifier);
    const data = generateTranslationRequestData(sourceLanguage === "auto" ? res.result.lang : sourceLanguage, targetLanguage, extractSplitSentences(res), identifier, alternatives, formalityTone);
    return yield got.post(API_URL, {
      json: data
    }).json();
  });
}
function translate(_0, _1) {
  return __async(this, arguments, function* (text, targetLanguage, sourceLanguage = AUTO, identifier, alternatives, formalityTone) {
    var _a;
    return extractTranslatedSentences(yield requestTranslation(text, abbreviateLanguage(targetLanguage), (_a = abbreviateLanguage(sourceLanguage)) != null ? _a : "auto", identifier, alternatives, formalityTone)).join(" ");
  });
}

exports.API_URL = API_URL;
exports.AUTO = AUTO;
exports.SUPPORTED_FORMALITY_TONES = SUPPORTED_FORMALITY_TONES;
exports.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
exports.abbreviateLanguage = abbreviateLanguage;
exports.calculateValidTimestamp = calculateValidTimestamp;
exports.count = count;
exports.createAbbreviationsDictionary = createAbbreviationsDictionary;
exports.extractSplitSentences = extractSplitSentences;
exports.extractTranslatedSentences = extractTranslatedSentences;
exports.generateId = generateId;
exports.generateJobs = generateJobs;
exports.generateSplitSentencesRequestData = generateSplitSentencesRequestData;
exports.generateTimestamp = generateTimestamp;
exports.generateTranslationRequestData = generateTranslationRequestData;
exports.randRange = randRange;
exports.requestTranslation = requestTranslation;
exports.splitIntoSentences = splitIntoSentences;
exports.splitSentences = splitSentences;
exports.translate = translate;

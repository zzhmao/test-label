import {
  CHAR_EXTRA_REGION_CLASSES,
  CHAR_REGION_CLASS_LIST,
} from "./charRegionOptions.js";

const buildIndexedMap = (start, values) =>
  values.reduce((acc, value, index) => {
    acc[start + index] = value;
    return acc;
  }, {});

const buildOptionsFromDictionary = (dictionary) =>
  Object.keys(dictionary)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => dictionary[key]);

const charSelectableKana = [
  ..."\u3042\u3044\u3046\u3048\u304b\u304d\u304f\u3051\u3053\u3055\u3059\u305b\u305d\u305f\u3061\u3064\u3066\u3068\u306a\u306b\u306c\u306d\u306e\u306f\u3072\u3075\u307b\u307e\u307f\u3080\u3081\u3082\u3084\u3086\u3088\u3089\u308a\u308b\u308c\u308d\u308f\u3092",
];

const charDetectionKana = [...charSelectableKana];

const charLetterClasses = ["A", "C", "F", "H", "K", "L", "M", "P", "X", "Y"];

const charClassDictionary = {
  ...buildIndexedMap(
    0,
    Array.from({ length: 10 }, (_, index) => String(index))
  ),
  ...buildIndexedMap(10, charDetectionKana),
  ...buildIndexedMap(52, CHAR_REGION_CLASS_LIST),
  188: "dot",
  ...buildIndexedMap(189, charLetterClasses),
  ...buildIndexedMap(199, CHAR_EXTRA_REGION_CLASSES),
};

export const THREE_LABEL_PAGE_CONFIG = Object.freeze({
  options: ["\u8eca\u4e21", "\u8eca\u756a", "\u982d"],
  classDictionary: {
    0: "\u8eca\u4e21",
    1: "\u8eca\u756a",
    2: "\u982d",
  },
  uploadType: "three",
  sortLocale: "zh-CN",
  keyboardCategoryShortcutCount: 3,
  requiredAnnotationCount: null,
  countWarningText: "",
});

export const CHAR_LABEL_PAGE_CONFIG = Object.freeze({
  options: buildOptionsFromDictionary(charClassDictionary),
  classDictionary: charClassDictionary,
  uploadType: "char",
  sortLocale: "ja",
  keyboardCategoryShortcutCount: 0,
  requiredAnnotationCount: 9,
  countWarningText: "\u30e9\u30d9\u30eb\u6570\u7570\u5e38",
});

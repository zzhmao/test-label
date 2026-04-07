<template>
  <div class="drawer-container">
    <div>
      <h3 class="drawer-title">{{ drawerTitle }}</h3>
      <p class="drawer-subtitle">{{ currentPageLabel }}</p>

      <template v-if="shortcutSections.length > 0">
        <div
          v-for="section in shortcutSections"
          :key="section.title"
          class="shortcut-section"
        >
          <div class="section-title">{{ section.title }}</div>
          <div
            v-for="item in section.items"
            :key="`${section.title}-${item.keys}`"
            class="shortcut-item"
          >
            <span class="shortcut-keys">{{ item.keys }}</span>
            <span class="shortcut-desc">{{ item.description }}</span>
          </div>
        </div>
      </template>

      <div v-else class="empty-text">
        {{ emptyText }}
      </div>
    </div>
  </div>
</template>

<script>
const TEXT = {
  drawerTitle: "\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u30ac\u30a4\u30c9",
  emptyText:
    "\u3053\u306e\u30da\u30fc\u30b8\u3067\u4f7f\u3048\u308b\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u306f\u3042\u308a\u307e\u305b\u3093\u3002",
  currentPageFallback:
    "\u73fe\u5728\u306e\u30da\u30fc\u30b8\u306e\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u4e00\u89a7",
  currentPageSuffix:
    "\u306e\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u4e00\u89a7",
};

const BASE_SHORTCUT_SECTIONS = [
  {
    title: "\u7de8\u96c6",
    items: [
      { keys: "W", description: "\u30e9\u30d9\u30eb\u63cf\u753b\u3092\u958b\u59cb" },
      {
        keys: "Esc",
        description:
          "\u73fe\u5728\u306e\u63cf\u753b\u3092\u30ad\u30e3\u30f3\u30bb\u30eb",
      },
      {
        keys: "Delete",
        description:
          "\u9078\u629e\u4e2d\u306e\u30e9\u30d9\u30eb\u3092\u524a\u9664",
      },
      {
        keys: "Shift + \u30af\u30ea\u30c3\u30af",
        description:
          "\u8907\u6570\u306e\u30e9\u30d9\u30eb\u3092\u8ffd\u52a0\u9078\u629e",
      },
      {
        keys: "\u30c9\u30e9\u30c3\u30b0\u9078\u629e",
        description:
          "\u8907\u6570\u306e\u30e9\u30d9\u30eb\u3092\u56f2\u3093\u3067\u9078\u629e",
      },
      {
        keys: "R",
        description:
          "\u9078\u629e\u4e2d\u306e\u30e9\u30d9\u30eb\u5185\u5bb9\u3092\u5909\u66f4",
      },
      {
        keys: "Alt + ArrowUp",
        description:
          "\u9078\u629e\u4e2d\u306e\u30e9\u30d9\u30eb\u3092\u524d\u9762\u3078\u79fb\u52d5",
      },
      {
        keys: "Alt + ArrowDown",
        description:
          "\u9078\u629e\u4e2d\u306e\u30e9\u30d9\u30eb\u3092\u80cc\u9762\u3078\u79fb\u52d5",
      },
      {
        keys: "Ctrl + Z",
        description: "\u53d6\u308a\u6d88\u3057",
      },
      {
        keys: "Ctrl + Y",
        description: "\u3084\u308a\u76f4\u3057",
      },
    ],
  },
  {
    title: "\u30ab\u30c6\u30b4\u30ea",
    items: [
      {
        keys: "Q",
        description:
          "\u524d\u306e\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e",
      },
      {
        keys: "E",
        description:
          "\u6b21\u306e\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e",
      },
    ],
  },
  {
    title: "\u753b\u50cf\u79fb\u52d5",
    items: [
      {
        keys: "ArrowUp",
        description: "\u524d\u306e\u753b\u50cf\u3078\u79fb\u52d5",
      },
      {
        keys: "ArrowDown",
        description: "\u6b21\u306e\u753b\u50cf\u3078\u79fb\u52d5",
      },
    ],
  },
  {
    title: "\u8868\u793a",
    items: [
      { keys: "Ctrl + +", description: "\u62e1\u5927" },
      { keys: "Ctrl + -", description: "\u7e2e\u5c0f" },
      {
        keys: "Ctrl + 0",
        description:
          "\u62e1\u5927\u7387\u3068\u4f4d\u7f6e\u3092\u30ea\u30bb\u30c3\u30c8",
      },
      {
        keys: "\u30db\u30a4\u30fc\u30eb",
        description: "\u62e1\u5927\u30fb\u7e2e\u5c0f",
      },
      {
        keys: "Space + \u30c9\u30e9\u30c3\u30b0",
        description:
          "\u62e1\u5927\u6642\u306e\u8868\u793a\u4f4d\u7f6e\u3092\u79fb\u52d5",
      },
      {
        keys: "H\uff08\u62bc\u3057\u3066\u3044\u308b\u9593\uff09",
        description:
          "\u3059\u3079\u3066\u306e\u30e9\u30d9\u30eb\u3092\u4e00\u6642\u7684\u306b\u96a0\u3059",
      },
      {
        keys: "J\uff08\u62bc\u3057\u3066\u3044\u308b\u9593\uff09",
        description:
          "\u5358\u4e00\u9078\u629e\u4e2d\u306e\u30e9\u30d9\u30eb\u3060\u3051\u3092\u4e00\u6642\u7684\u306b\u96a0\u3059",
      },
    ],
  },
];

const PAGE_SHORTCUT_MAP = {
  three: {
    title: "three \u30da\u30fc\u30b8",
    extraSections: [
      {
        title: "three \u5c02\u7528",
        items: [
          {
            keys: "1",
            description:
              "1\u756a\u76ee\u306e\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e",
          },
          {
            keys: "2",
            description:
              "2\u756a\u76ee\u306e\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e",
          },
          {
            keys: "3",
            description:
              "3\u756a\u76ee\u306e\u30ab\u30c6\u30b4\u30ea\u3092\u9078\u629e",
          },
        ],
      },
    ],
  },
  char: {
    title: "char \u30da\u30fc\u30b8",
    extraSections: [],
  },
};

export default {
  name: "ShortcutGuideSettings",
  computed: {
    drawerTitle() {
      return TEXT.drawerTitle;
    },
    emptyText() {
      return TEXT.emptyText;
    },
    currentPageKey() {
      const routeName = this.$route && this.$route.name ? this.$route.name : "";
      if (routeName === "label") {
        const mode =
          this.$route && this.$route.query ? this.$route.query.mode : "";
        return PAGE_SHORTCUT_MAP[mode] ? mode : "";
      }
      return PAGE_SHORTCUT_MAP[routeName] ? routeName : "";
    },
    currentPageConfig() {
      return PAGE_SHORTCUT_MAP[this.currentPageKey] || null;
    },
    currentPageLabel() {
      if (this.currentPageConfig) {
        return `${this.currentPageConfig.title}${TEXT.currentPageSuffix}`;
      }
      return TEXT.currentPageFallback;
    },
    shortcutSections() {
      if (!this.currentPageConfig) {
        return [];
      }
      return [
        ...BASE_SHORTCUT_SECTIONS,
        ...this.currentPageConfig.extraSections,
      ];
    },
  },
};
</script>

<style lang="scss" scoped>
.drawer-container {
  padding: 24px;
  height: 100%;
  max-height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;

  .drawer-title {
    margin-bottom: 6px;
    color: rgba(0, 0, 0, 0.85);
    font-size: 16px;
    line-height: 24px;
  }

  .drawer-subtitle {
    margin: 0 0 16px;
    color: rgba(0, 0, 0, 0.55);
    font-size: 13px;
  }

  .shortcut-section + .shortcut-section {
    margin-top: 18px;
  }

  .section-title {
    margin-bottom: 8px;
    color: rgba(0, 0, 0, 0.85);
    font-size: 13px;
    font-weight: 600;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
    flex-wrap: nowrap;
  }

  .shortcut-keys {
    min-width: 132px;
    color: #409eff;
    font-weight: 600;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .shortcut-desc {
    flex: 1 1 auto;
    color: rgba(0, 0, 0, 0.65);
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-text {
    color: rgba(0, 0, 0, 0.55);
    font-size: 13px;
  }
}
</style>

const state = {
  canvasContent: null,
  canvasBackground: null,
  canvasScale: { scaleX: null, scaleY: null },
  selectedArea: null,
  layoutData: null,
  fromGoToSimulation: false,
  parkingSpaceCoords: [], // 新增state属性以存储坐标
};

const mutations = {
  setCanvasContent(state, content) {
    state.canvasContent = content;
  },
  setCanvasBackgroundImage(state, backgroundImage) {
    state.canvasBackground = backgroundImage;
  },
  setCanvasScale(state, { scaleX, scaleY }) { // 添加mutation以设置scaleX和scaleY
    state.canvasScale.scaleX = scaleX;
    state.canvasScale.scaleY = scaleY;
  },
  setScaleFix(state, scaleFix) {
    state.scaleFix = scaleFix;
  },
  setCanvasBorder(state, borderData) {
    state.border = borderData;
  },
  setSelectedArea(state, area) {
    state.selectedArea = area;
  },
  setLayoutData(state, data) { // 更新mutation名称
    state.layoutData = data;
  },
  setParkingSpaceCoords(state, coords) { // 新增mutation以设置坐标
    state.parkingSpaceCoords = coords;
  },
  setFromGoToSimulation(state, value) {
    state.fromGoToSimulation = value;
  },
};

const actions = {
  // 可以在这里添加一些异步操作
  saveLayoutData({ commit }, data) { // 更新action名称
    commit('setLayoutData', data);
  },
  saveParkingSpaceCoords({ commit }, coords) {
    commit('setParkingSpaceCoords', coords);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

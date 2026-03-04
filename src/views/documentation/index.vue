<template>
  <div>
    <iframe :src="webpageUrl" width="100%" height="600px"></iframe>
  </div>
</template>

<script>
export default {
  data() {
    return {
      webpageUrl: 'https://dashboard.park4d.com'
    };
  }
};
</script>

<style lang="scss" scoped>

</style>

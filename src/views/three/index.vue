<template>
  <div />
</template>

<script>
export default {
  name: "ThreePageRedirect",
  created() {
    this.$router.replace({
      path: "/label/index",
      query: {
        mode: "three",
      },
    });
  },
};
</script>

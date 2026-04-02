<template>
  <div />
</template>

<script>
export default {
  name: "CharPageRedirect",
  created() {
    this.$router.replace({
      path: "/label/index",
      query: {
        mode: "char",
      },
    });
  },
};
</script>

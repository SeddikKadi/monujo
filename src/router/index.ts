import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import publicRoutes from "@/router/routes/public";
import privateRoutes from "@/router/routes/private";
import { useStore } from "vuex";

let allRoutes: any = [];
allRoutes = allRoutes.concat(publicRoutes, privateRoutes);

const routes = [
  {
    path: "/",
    redirect: "/Login",
  },
].concat(allRoutes);

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const store: any = useStore();
  const authenticated = store.requestLogin();
  const onlyLoggedOut = to.matched.some((record) => record.meta.onlyLoggedOut);
  const isPublic = to.matched.some((record) => record.meta.public);
  if (!isPublic && authenticated === false) {
    // this route requires auth, check if logged in
    // if not, redirect to login page.
    return next({
      path: "/",
      query: { redirect: to.fullPath },
    });
  }
  if (authenticated && onlyLoggedOut) {
    return next("/profile");
  }
  next();
});

export default router;

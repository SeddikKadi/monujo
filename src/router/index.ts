import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import store from '../store'
import Dashboard from "../views/Dashboard.vue";
import Login from "../views/Login.vue";
import CreateMyAccount from "../views/CreateMyAccount.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/dashboard",
    name: "dashboard",
    meta: { title: "Tableau de bord" },
    component: Dashboard,
  },
  {
    path: "/",
    name: "Login",
    meta: { title: "Connection" },
    component: Login,
  },
  {
    path: "/create-account",
    name: "Create my account",
    meta: { title: "Créer mon portefeuille" },
    component: CreateMyAccount,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Authentication guard
router.beforeEach((to, from, next) => {
  if (to.name !== 'Login' && store.getters.isAuthenticated === false) next({ name: 'Login' })
  else next()
})

export default router;

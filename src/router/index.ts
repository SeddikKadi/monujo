import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Profile from "../views/Profile.vue";
import Login from "../views/Login.vue";
import CreateMyAccount from "../views/CreateMyAccount.vue";
import Administration from "../views/Administration.vue";
import PendingAccounts from "../components/admin/PendingAccounts.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/profile",
    name: "Profile",
    meta: { title: "Tableau de bord" },
    component: Profile,
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
  {
    path: "/admin",
    name: "Administration",
    meta: { title: "Administration" },
    component: Administration,
    children: [
      {
        path: "pending-accounts",
        name: "Validate pending accounts",
        meta: { title: "Validation des comptes en attente de création" },
        component: PendingAccounts,
      },
    ]
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;

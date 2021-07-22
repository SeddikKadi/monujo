import Login from "@/views/Login.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: Login,
  }
];

export default routes.map((route) => {
  const meta = {
    public: true,
    onlyLoggedOut: true,
    title: 'Accueil'
  };
  return { ...route, meta };
});

import Profile from "@/views/Profile.vue";

const routes = [
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: {
      title: "Profile",
    },
  },
];

export default routes.map((route) => {
  const meta = {
    public: false,
    title: "Profile",
  };
  return { ...route, meta };
});

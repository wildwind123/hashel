// Renders the element opened by hashel (one *.el.vue file per page).
import { createApp } from "vue";
import { Component } from "hashel";
import "./style.css";

createApp(Component).mount("#app");

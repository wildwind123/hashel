// Renders the element opened by hashel (one *.el.svelte file per page).
import { mount } from "svelte";
import { Component } from "hashel";
import "./app.css";

mount(Component, { target: document.getElementById("app")! });

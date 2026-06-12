/**
 * Точка входа в приложение
 * Инициализирует React приложение и подключает глобальные стили
 */

import React from "react";
import ReactDOM from "react-dom/client";

// Компоненты
import App from "./App";

// Стили
import "./index.css";
import "antd/dist/reset.css";

// Константы
const ROOT_ELEMENT_ID = "root";

/**
 * Инициализация и рендеринг приложения
 */
function initializeApp(): void {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  
  if (!rootElement) {
    throw new Error(`Элемент с ID "${ROOT_ELEMENT_ID}" не найден в DOM`);
  }

  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Запуск приложения
initializeApp();
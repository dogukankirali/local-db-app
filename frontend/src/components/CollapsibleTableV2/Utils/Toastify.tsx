import React from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Toastify(props: {
  title: string | number;
  subtitle: string | number;
  duration?: number;
  position?: "top-right";
  theme: "dark" | "light";
  type: "info" | "success" | "error" | "warning";
}) {
  function setHeaderColor(type: string, theme: string) {
    if (theme === "light" || theme === "light_accessibility") {
      if (type === "error") {
        return "#FF6C62";
      } else if (type === "success") {
        return "#60BB46";
      } else if (type === "warning") {
        return "#FAAB00";
      }
    } else {
      if (type === "error") {
        return "#FF0000";
      } else if (type === "success") {
        return "#60BB46";
      } else if (type === "warning") {
        return "#C88900";
      }
    }
  }

  const Msg = ({ closeToast, toastProps }: any) => (
    <div id="toastify-alert" style={{ display: "grid", placeItems: "center" }}>
      <h5
        style={{
          color: setHeaderColor(toastProps.type, props.theme),
          fontFamily: "Source Sans Pro",
        }}
      >
        {props.title}
      </h5>
      <p
        style={{
          color: props.theme === "light" ? "#3D3D3D" : "#FFFFFF",
          fontFamily: "Work Sans",
        }}
      >
        {props.subtitle}
      </p>
    </div>
  );

  toast(<Msg />, {
    position: props.position ?? "top-right",
    theme: props.theme,
    autoClose: props.duration ?? 1500,
    type: props.type,
    icon: false,
  });
}

export default Toastify;

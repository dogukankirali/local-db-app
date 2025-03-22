import { TableCell } from "@mui/material";
import { useState } from "react";

export default function Cover(props: {
  cover: string;
  alt?: string;
  planToWatch?: boolean;
}) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <TableCell
      className="p-4 border-b border-slate-200 py-5 relative"
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      <div className="relative inline-block">
        <img
          src={props.cover}
          alt={props.alt || "Cover"}
          className="w-16 h-16 object-cover rounded"
        />
        {props.planToWatch === true && (
          <div
            className="absolute top-0 right-0 bg-yellow-400 text-black font-bold z-10"
            style={{
              width: "24px",
              height: "24px",
              clipPath: "polygon(0 0, 100% 0, 100% 100%)",
            }}
          >
            <div
              className="absolute text-[8px]"
              style={{
                top: "2px",
                right: "2px",
                transform: "rotate(45deg)",
              }}
            >
              PTW
            </div>
          </div>
        )}
      </div>
      {showPopup && (
        <div
          className={`absolute z-50 left-20 -top-10 bg-white p-2 rounded-lg shadow-xl
          ${
            showPopup
              ? "animate__animated animate__fadeIn"
              : "animate__animated animate__fadeOut"
          }`}
        >
          <div className="relative inline-block">
            <img
              src={props.cover}
              alt={props.alt || "Cover"}
              className="w-48 h-48 object-cover rounded"
            />
            {props.planToWatch === true && (
              <div
                className="absolute top-0 right-0 bg-yellow-400 text-black font-bold z-10"
                style={{
                  width: "48px",
                  height: "48px",
                  clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                }}
              >
                <div
                  className="absolute text-sm"
                  style={{
                    top: "6px",
                    right: "8px",
                    transform: "rotate(45deg)",
                    transformOrigin: "center",
                  }}
                >
                  PTW
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </TableCell>
  );
}

import React from "react";
import styles from "./Header.module.css";

function Header(props) {
  return (
    <div className={styles.header}>
      <table style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td className={styles.title}>{"Legend"}</td>
            <td style={{ width: "60px" }}>
              <img
                onClick={() => {
                  window.location.href = "mailto:?subject=Map Legend from opengis.simcoe.ca&body=" + encodeURIComponent(window.location.href);
                }}
                title="Share this page through E-Mail"
                className="headerButton"
                src={images["share-icon.png"]}
                alt="Share"
              />
            </td>

            <td style={{ width: "60px" }}>
              <img
                alt="Print"
                onClick={() => {
                  window.print();
                }}
                title="Print this page"
                className="headerButton"
                src={images["print-icon.png"]}
              />
            </td>
            <td style={{ width: "60px" }}>
              <img
                alt="Open In New Window"
                onClick={() => {
                  window.open(window.location.href, "_blank");
                }}
                title="Open this page in a new window"
                className="headerButton"
                src={images["new-window-icon.png"]}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Header;

// IMPORT ALL IMAGES - Vite uses import.meta.glob instead of require.context
const imageModules = import.meta.glob("./images/*.{png,jpg,jpeg,svg,gif}", { eager: true });
const images = {};
Object.entries(imageModules).forEach(([path, module]) => {
  const fileName = path.replace("./images/", "");
  images[fileName] = module.default;
});

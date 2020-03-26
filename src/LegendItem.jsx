import React from "react";
import styles from "./LegendItem.module.css";
import * as helpers from "./helpers";
import cx from "classnames";

function LegendItem(props) {
  const { layer } = props;
  return (
    <div className={props.center ? cx(styles.container, styles.containerCenter) : styles.container}>
      <label className={styles.title}>{helpers.replaceAllInString(layer.layerName, "_", " ")}</label>
      <img className={props.center ? cx(styles.image, styles.imageCenter) : styles.image} src={layer.imageUrl} alt="Legend" />
    </div>
  );
}

export default LegendItem;

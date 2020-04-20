import React, { Component } from "react";
// import Masonry from "react-masonry-component";
import Masonry from "react-masonry-css";
import "./Global.css";
import styles from "./App.module.css";
import "./App.css";
import * as helpers from "./helpers";
import Header from "./Header";
import GroupItem from "./GroupItem";
import Select from "react-select";
import cx from "classnames";

// THIS APP ACCEPTS LIST OF GROUPS
//http://localhost:3001/?All_Layers=1&Popular=1

const groupUrlTemplate = (groupName) => `https://opengis.simcoe.ca/geoserver/rest/layergroups/${groupName}.json`;
const styleUrlTemplate = (layerName) => `https://opengis.simcoe.ca/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}`;
const params = helpers.getParams(window.location.href);
console.log(params);

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      groups: [],
      selectedGroups: [],
      justifyCenter: false,
    };
  }

  componentDidMount() {
    let selectedGroups = [];
    Object.keys(params).forEach((groupName) => {
      const onOrOff = params[groupName];
      const groupUrl = groupUrlTemplate(groupName);
      let layers = [];
      helpers.getJSON(groupUrl, (groupInfo) => {
        const published = groupInfo.layerGroup.publishables.published;

        published.forEach((layer1) => {
          const fullLayerName = layer1.name;
          const layerName = fullLayerName.split(":")[1];
          const obj = { imageUrl: styleUrlTemplate(fullLayerName), layerName: layerName };
          layers.push(obj);
        });

        const obj = { value: groupName, label: helpers.replaceAllInString(groupName, "_", " "), layers: layers };
        if (onOrOff === "1") selectedGroups.push(obj);

        // ADD NEW FEATURE TO STATE
        this.setState((prevState) => ({
          groups: [obj, ...prevState.groups],
          selectedGroups,
        }));
      });
    });
  }

  handleChange = (selectedGroups) => {
    this.setState({ selectedGroups });
    console.log(`Option selected:`, selectedGroups);
  };

  render() {
    const childElements = this.state.selectedGroups.map((group) => {
      return <GroupItem key={helpers.getUID()} group={group} center={this.state.justifyCenter} />;
    });

    const breakpointColumnsObj = {
      default: 4,
      2460: 3,
      1640: 2,
      900: 1,
    };

    return (
      <div className={styles.mainContainer} id="sc-legend-app-main-container">
        <Header onShareClick={this.onShareClick} />
        <div style={{ marginLeft: "5px" }}>
          <label>Groups:</label>
          <div className={styles.selectContainer}>
            <Select
              isMulti
              name="groups"
              options={this.state.groups}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={this.handleChange}
              selectedOption={this.state.selectedGroups}
              value={this.state.selectedGroups}
            />
          </div>
        </div>

        <div className={styles.justifyButtons}>
          <div className={this.state.justifyCenter ? styles.justifyButtonContainer : cx(styles.justifyButtonContainer, styles.activeButton)} onClick={() => this.setState({ justifyCenter: false })}>
            <img className={styles.justifyImage} src={images["left-justify.png"]} alt="left-justify" title="Left Justify"></img>
          </div>

          <div className={this.state.justifyCenter ? cx(styles.justifyButtonContainer, styles.activeButton) : styles.justifyButtonContainer} onClick={() => this.setState({ justifyCenter: true })}>
            <img className={styles.justifyImage} src={images["center-justify.png"]} alt="right-justify" title="Center Justify"></img>
          </div>
        </div>
        <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
          {childElements}
        </Masonry>
        <div className="footer">
          <div style={{ float: "left" }}>
            Layer info page generated using{" "}
            <a href="https://opengis.simcoe.ca" target="_blank" rel="noopener noreferrer">
              opengis.simcoe.ca
            </a>{" "}
            interactive mapping.
            <br />
          </div>
          <div style={{ float: "right" }}>{"Generated on: " + helpers.formatDate()}</div>
        </div>
      </div>
    );
  }
}

export default App;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  // eslint-disable-next-line
  r.keys().map((item, index) => {
    images[item.replace("./", "")] = r(item);
  });
  return images;
}

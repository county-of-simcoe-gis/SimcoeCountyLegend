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
import mainConfig from "./config.json";
import ReactGA from "react-ga4";
import xml2js from "xml2js";

if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "") {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
}

const mainGroupUrl = mainConfig.geoserverLayerGroupsUrl;

// THIS APP ACCEPTS LIST OF GROUPS
//http://localhost:3001/?All_Layers=1&Popular=1

const params = helpers.getParams(window.location.href);

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
    this.getGroups(mainGroupUrl, (result) => {
      // Handle case where result is null or empty
      if (!result || !result[0] || !Array.isArray(result[0])) {
        console.error("Failed to load groups from WMS");
        this.setState({ groups: [], selectedGroups: [] });
        return;
      }

      let selectedGroups = [];
      const groups = result[0];
      let groupsObj = [];
      groups.forEach((group) => {
        const onOrOff = params[group.value.split(":")[1]];
        let layers = [];
        group.layers.forEach((layer) => {
          const layerObj = { imageUrl: layer.styleUrl, layerName: layer.name.split(":")[1], tocDisplayName: layer.tocDisplayName };
          layers.push(layerObj);
        });
        const groupObj = { label: group.label, value: group.value.split(":")[1], layers: layers };
        if (onOrOff === "1") selectedGroups.push(groupObj);
        groupsObj.push(groupObj);
      });

      // ADD NEW FEATURE TO STATE
      this.setState({ groups: groupsObj, selectedGroups });
    });
  }

  handleChange = (selectedGroups) => {
    if (selectedGroups === null) selectedGroups = [];
    this.setState({ selectedGroups });
  };

  // GET GROUPS FROM GET CAPABILITIES
  getGroups(url, callback) {
    const layerIndexStart = 100;
    const urlType = "group";
    let defaultGroup = null;
    let isDefault = false;
    let groups = [];
    const remove_underscore = (name) => {
      return helpers.replaceAllInString(name, "_", " ");
    };

    helpers.httpGetText(url, (result) => {
      // Check if we got a valid response
      if (!result || typeof result !== "string" || result.trim() === "") {
        console.error("Empty or invalid response from WMS GetCapabilities");
        callback([[], null]);
        return;
      }

      try {
        var parser = new xml2js.Parser();

        // PARSE TO JSON
        parser.parseString(result, (err, parsedResult) => {
          // Handle parsing errors
          if (err) {
            console.error("XML parsing error:", err);
            callback([[], null]);
            return;
          }

          // Validate parsed result structure
          if (
            !parsedResult ||
            !parsedResult.WMS_Capabilities ||
            !parsedResult.WMS_Capabilities.Capability ||
            !parsedResult.WMS_Capabilities.Capability[0] ||
            !parsedResult.WMS_Capabilities.Capability[0].Layer ||
            !parsedResult.WMS_Capabilities.Capability[0].Layer[0]
          ) {
            console.error("Invalid WMS Capabilities structure:", JSON.stringify(parsedResult, null, 2));
            callback([[], null]);
            return;
          }

          try {
            const baseLayer = parsedResult.WMS_Capabilities.Capability[0].Layer[0];

            // For "group" urlType, we need Layer[0].Layer[0].Layer
            // First validate the nested structure exists
            let groupLayerList;
            if (urlType === "root") {
              groupLayerList = baseLayer.Layer;
            } else if (urlType === "group") {
              // Need to access Layer[0].Layer - check it exists first
              if (!baseLayer.Layer || !baseLayer.Layer[0] || !baseLayer.Layer[0].Layer) {
                console.error("Invalid nested layer structure for group type. baseLayer:", JSON.stringify(baseLayer, null, 2));
                callback([[], null]);
                return;
              }
              groupLayerList = baseLayer.Layer[0].Layer;
            } else {
              groupLayerList = baseLayer.Layer;
            }

            // Validate groupLayerList exists
            if (!groupLayerList || !Array.isArray(groupLayerList)) {
              console.error("No layer groups found in WMS Capabilities. groupLayerList:", groupLayerList);
              callback([[], null]);
              return;
            }

            groupLayerList.forEach((layerInfo) => {
              if (layerInfo.Layer !== undefined) {
                const groupName = layerInfo.Name[0];
                const groupDisplayName = layerInfo.Title[0];
                const groupUrl = url.split("/geoserver/")[0] + "/geoserver/" + helpers.replaceAllInString(groupName, ":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
                const fullGroupUrl = url.split("/geoserver/")[0] + "/geoserver/" + helpers.replaceAllInString(groupName, ":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";

                let layerList = [];
                if (layerInfo.Layer !== undefined) {
                  const groupLayerListInner = layerInfo.Layer;

                  let layerIndex = groupLayerListInner.length + layerIndexStart;
                  const tmpGroupObj = {
                    value: groupName,
                    label: remove_underscore(groupDisplayName),
                    url: groupUrl,
                    wmsGroupUrl: fullGroupUrl,
                  };

                  const buildLayers = (layers) => {
                    if (layers === undefined) return;
                    layers.forEach((currentLayer) => {
                      if (!this.isDuplicate(layerList, currentLayer.Name[0])) {
                        this.buildLayerByGroup(tmpGroupObj, currentLayer, layerIndex, (layerResult) => {
                          layerList.push(layerResult);
                        });
                        layerIndex--;

                        buildLayers(currentLayer.Layer);
                      }
                    });
                  };

                  buildLayers(layerInfo.Layer);
                }

                const groupObj = {
                  value: groupName,
                  label: remove_underscore(groupDisplayName),
                  url: groupUrl,
                  defaultGroup: isDefault,
                  wmsGroupUrl: fullGroupUrl,
                  layers: layerList,
                };
                if (groupObj.layers.length >= 1) {
                  groups.push(groupObj);
                  if (isDefault) {
                    defaultGroup = groupObj;
                    isDefault = false;
                  }
                }
              }
            });
          } catch (e) {
            console.error("Error processing WMS Capabilities:", e);
            callback([[], null]);
            return;
          }

          if (defaultGroup === undefined || defaultGroup === null) defaultGroup = groups[0];
          callback([groups, defaultGroup]);
        });
      } catch (parseError) {
        console.error("Error initializing XML parser:", parseError);
        callback([[], null]);
      }
    });
  }

  _getStaticImageLegend(keywords) {
    if (keywords === undefined) return false;
    const keyword = keywords.find((item) => {
      return item.indexOf("STATIC_IMAGE_LEGEND") !== -1;
    });
    if (keyword !== undefined) return true;
    else return false;
  }

  buildLayerByGroup(group, layer, layerIndex, callback) {
    if (layer.Layer === undefined) {
      const layerNameOnly = layer.Name[0];
      let layerTitle = layer.Title[0];
      if (layerTitle === undefined) layerTitle = layerNameOnly;
      let keywords = [];
      if (layer.KeywordList !== undefined && layer.KeywordList.length > 0) keywords = layer.KeywordList[0].Keyword;

      let styleUrl = layer.Style[0].LegendURL[0].OnlineResource[0].$["xlink:href"].replace("http", "https");
      let legendSizeOverride = this._getStaticImageLegend(keywords);

      if (legendSizeOverride && styleUrl !== "") {
        const legendSize = layer.Style !== undefined ? layer.Style[0].LegendURL[0].$ : [20, 20];
        styleUrl = styleUrl.replace("width=20", `width=${legendSize.width}`).replace("height=20", `height=${legendSize.height}`);
      }
      const serverUrl = group.wmsGroupUrl.split("/geoserver/")[0] + "/geoserver";
      const wfsUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=application/json&cql_filter=`;
      const wfsUrl = wfsUrlTemplate(serverUrl, layer.Name[0]);

      const metadataUrlTemplate = (serverUrl, layerName) => `${serverUrl}/rest/layers/${layerName}.json`;
      const metadataUrl = metadataUrlTemplate(serverUrl, layer.Name[0]);

      // TOC DISPLAY NAME
      const tocDisplayName = layerTitle;

      const returnLayer = {
        name: layerNameOnly, // FRIENDLY NAME
        height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
        drawIndex: layerIndex, // INDEX USED BY VIRTUAL LIST
        index: layerIndex, // INDEX USED BY VIRTUAL LIST
        styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
        showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
        legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
        legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
        metadataUrl: metadataUrl, // ROOT LAYER INFO FROM GROUP END POINT
        wfsUrl: wfsUrl,
        tocDisplayName: tocDisplayName, // DISPLAY NAME USED FOR TOC LAYER NAME
        group: group.value,
        groupName: group.label,
        serverUrl: serverUrl + "/", // BASE URL FOR GEOSERVER
      };
      callback(returnLayer);
    }
  }

  isDuplicate(layerList, newLayerName) {
    let returnValue = false;
    layerList.forEach((layer) => {
      if (layer.name === newLayerName) {
        returnValue = true;
      }
    });
    return returnValue;
  }

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
      <div className={styles.mainContainer || ''} id="sc-legend-app-main-container">
        <Header onShareClick={this.onShareClick} />
        <div style={{ marginLeft: "5px" }}>
          <label>Groups:</label>
          <div className={styles.selectContainer || ''}>
            <Select 
              isMulti 
              name="groups" 
              options={this.state.groups} 
              classNamePrefix="select" 
              onChange={this.handleChange} 
              value={this.state.selectedGroups}
              getOptionLabel={(option) => option?.label || ''}
              getOptionValue={(option) => option?.value || ''}
            />
          </div>
        </div>

        <div className={styles.justifyButtons || ''}>
          <div className={this.state.justifyCenter ? (styles.justifyButtonContainer || '') : cx(styles.justifyButtonContainer || '', styles.activeButton || '')} onClick={() => this.setState({ justifyCenter: false })}>
            <img className={styles.justifyImage || ''} src={images["left-justify.png"]} alt="left-justify" title="Left Justify"></img>
          </div>

          <div className={this.state.justifyCenter ? cx(styles.justifyButtonContainer || '', styles.activeButton || '') : (styles.justifyButtonContainer || '')} onClick={() => this.setState({ justifyCenter: true })}>
            <img className={styles.justifyImage || ''} src={images["center-justify.png"]} alt="right-justify" title="Center Justify"></img>
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

// IMPORT ALL IMAGES - using direct imports for reliability in production
import leftJustifyImg from "./images/left-justify.png";
import centerJustifyImg from "./images/center-justify.png";
import newWindowImg from "./images/new-window-icon.png";
import printImg from "./images/print-icon.png";
import shareImg from "./images/share-icon.png";

const images = {
  "left-justify.png": leftJustifyImg,
  "center-justify.png": centerJustifyImg,
  "new-window-icon.png": newWindowImg,
  "print-icon.png": printImg,
  "share-icon.png": shareImg,
};

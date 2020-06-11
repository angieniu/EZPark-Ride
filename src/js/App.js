// pull in information from King county api
var dataSrc =
  "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/transportation___base/MapServer/386/query?where=1%3D1&outFields=*&outSR=4326&f=json";
var PARKINGS = [];
var dataGateway = "https://my.api.mockaroo.com/park-ride.json?key=49e98710";
//var dataGateway = "https://my.api.mockaroo.com/backup.json?key=079857d0";

var mymap = L.map("map").setView([47.54148704, -122.22524267], 11);
// search open cage data
var options = {
  key: "46b75484211a4f2b989d499873881d63",
  limit: 10,
  placeholder: "Address or Zip Code",
  proximity: "51.52255, -0.10249", // favour results near here
  errorMessage: "Nothing found.",
  showResultIcons: false,
  collapsed: true,
  expand: "click"
};
// Add a search function to the page for users to enter the addresses or zip codes of interested destinations in order to be able to check the parking availability of Park & Ride facilities nearby.
var control = L.Control.openCageSearch(options).addTo(mymap);

L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    minZoom: 4,
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
    accessToken:
      "pk.eyJ1IjoiYW5naWVuIiwiYSI6ImNrOW5jN284NzAwc2wzZW9ka29lbmU2ZWcifQ.puqiCE83jHhsIu7gTUGBKw"
  }
).addTo(mymap);
var markersLayer = new L.LayerGroup().addTo(mymap);

var parkIcon = L.Icon.extend({
  options: {
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  }
});

var greenIcon = new parkIcon({
    iconUrl:
      "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png"
  }),
  redIcon = new parkIcon({
    iconUrl:
      "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
  }),
  goldIcon = new parkIcon({
    iconUrl:
      "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png"
  });
// numofspaces means available spaces. absolute number (better) vs %. threshold > total, the same.
// threshold: > 50 spaces green; > 20 yellow, <=20 red
function getIcon(numOfSpaces) {
  if (numOfSpaces <= 20) {
    return redIcon;
  }
  if (numOfSpaces > 20 && numOfSpaces <= 50) {
    return goldIcon;
  }
  return greenIcon;
}

// dropdown filter
var mapFilter = document.getElementById("availability-dropdown");
mapFilter.addEventListener("change", function() {
  markersLayer.clearLayers();
  renderMap(PARKINGS);
});

/*
Two sources of data:
after parse dataSrc, we have a field in the nested array of json objects:

*/
function parseJson(response) {
  return response.json();
}

function callRenderMap(data) {
  PARKINGS = data.features.map((location, index) => {
    location.numOfSpaces = AVAILABLENUM[index];
    return location;
  });
  renderMap(PARKINGS);
}

function filteredParkingList(list) {
  return list.filter(function(item) {
    if (mapFilter.value == "all") {
      return true;
    }
    if (mapFilter.value == "green" && item.numOfSpaces > 50) {
      return true;
    }
    if (
      mapFilter.value == "gold" &&
      item.numOfSpaces > 20 &&
      item.numOfSpaces <= 50
    ) {
      return true;
    }
    if (
      mapFilter.value == "red" &&
      item.numOfSpaces <= 20 &&
      item.numOfSpaces >= 0
    ) {
      return true;
    }
    return false;
  });
}

function renderMap(parking_list) {
  //get filtered list
  parking_list = filteredParkingList(parking_list);
  parking_list.forEach(location => {
    var marker = L.marker(
      [location.attributes.LATITUDE, location.attributes.LONGITUDE],
      { icon: getIcon(location.numOfSpaces) }
    ).addTo(markersLayer);
    marker.bindPopup(
      "<h3>" +
        location.attributes.NAME +
        "</h3>" +
        "<p>" +
        "<Strong>Address: </Strong>" +
        location.attributes.ADDRESS +
        " <br />" +
        "<Strong>Zip Code: </Strong>" +
        location.attributes.ZIP +
        " <br />" +
        "<Strong>Total Spaces: </Strong>" +
        location.attributes.REG_SPACES +
        " <br />" +
        "<Strong>Available Spaces: </Strong>" +
        location.numOfSpaces +
        "</p>"
    );
  });
}

L.geoJson(PARKINGS, {
  onEachFeature: function(feature, layer) {
    feature.layer = layer;
  }
});

var AVAILABLENUM = [];
// fetch data about the numbers of available spaces in parking lots as an array ranked by parking ID. put it into an array.
function callRenderAvailableNumbers(data) {
  AVAILABLENUM = [];
  data.map(location => {
    AVAILABLENUM.push(location.availablespaces);
    return AVAILABLENUM;
  });
}

function handleError(error) {
  var body = document.querySelector("body");

  var errorParagraph = document.createElement("p");
  errorParagraph.textContext = "Error loading Park and Ride lots.";

  body.appendChild(errorParagraph);
  console.log(error);
}

//fetch data from king county api
// fetch(dataGateway)
//   .then(parseJson)
//   .then(callRenderAvailableNumbers)
//   .catch(handleError);
// setTimeout(function() {
//   fetch(dataSrc)
//     .then(parseJson)
//     .then(callRenderMap)
//     .catch(handleError);
// }, 100);

function refreshParkRide() {
  // fetch data from gateway which collects data from sensors
  fetch(dataGateway)
    .then(parseJson)
    .then(callRenderAvailableNumbers)
    .catch(handleError);
  fetch(dataSrc)
    .then(parseJson)
    .then(callRenderMap)
    .catch(handleError);
  setTimeout(refreshParkRide, 30000);
}
refreshParkRide();

// filtering
//Create content from data dynamically.
// implement functions
function renderParkrides(parkride_list) {
  // Sort the parkride_list
  //select the <tbody> element
  // referring to a particular <table> by ID or style class name
  var tbody = document.querySelector("tbody");
  // clear any existing content in the body
  tbody.textContent = "";

  // for each parkride in the array
  for (var i = 0; i < parkride_list.length; i++) {
    // render the parkride row
    var row = renderParkride(parkride_list[i]);
    // append it to the table
    tbody.appendChild(row);
  }
}

function renderParkride(parkride) {
  //create the <tr> element
  var tr = document.createElement("tr");

  //create and append the <td> elements
  tr.appendChild(renderParkrideProp(parkride.attributes.NAME, true));
  tr.appendChild(renderParkrideProp(parkride.attributes.ZIP));
  tr.appendChild(renderParkrideProp(parkride.attributes.ADDRESS));

  //return the table row to the caller
  return tr;
}

function renderParkrideProp(content, nonNumeric) {
  //create the new <td> element
  var td = document.createElement("td");

  //set its text content to the provided value
  td.textContent = content;

  // if it should be formatted as numeric
  if (nonNumeric) {
    //add the "numeric" style class
    td.classList.add("non-numeric");
  }

  //return the new element to the caller
  return td;
}

var searchInput = document.getElementById("parkride-filter");
// Should this parkride be in our list?
function isParkrideFound(parkride) {
  // Get the user input
  var userInput = searchInput.value;
  // Make the input lower case
  var lowercaseUserInput = userInput.toLowerCase();
  // Make the parkride title lowercase
  var lowercaseName = parkride.attributes.NAME.toLowerCase();
  var stringZip = parkride.attributes.ZIP.toString();
  var lowercaseAddress = parkride.attributes.ADDRESS.toLowerCase();
  // Check if the user input is in the lowercase parkride title
  if (lowercaseName.indexOf(lowercaseUserInput) >= 0) {
    return true;
  } else if (lowercaseAddress.indexOf(lowercaseUserInput) >= 0) {
    return true;
  } else if (stringZip.startsWith(userInput)) {
    return true;
  } else {
    return false;
  }
}
// Listen for when a user types in the filter field
searchInput.addEventListener("input", function() {
  // Find any parkrides that match the user input
  var filtered_parkrides = PARKRIDES.filter(isParkrideFound);
  // Update the parkride table with the new list
  renderParkrides(filtered_parkrides);
});

function myFunction() {
  var input = document.getElementById("mylist");
  var filter = input.value.toString();
  var table = document.getElementById("myTable");
  tr = table.getElementsByTagName("tr");
  for (var i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[0];
    if (td) {
      if (td.innerHTML.toString().startsWith(filter)) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}

// setInterval(function() {
//   fetch(dataGateway)
//     .then(parseJson)
//     .then(callRenderAvailableNumbers)
//     .catch(handleError);
//   fetch(dataSrc)
//     .then(parseJson)
//     .then(callRenderMap)
//     .catch(handleError);
// }, 30000);

// setInterval(function() {
//   //   //   countdown;
//   fetch(dataGateway)
//     .then(parseJson)
//     .then(callRenderAvailableNumbers)
//     .catch(handleError);
// }, 5000);

var yelpToken = {  // This was returned by Yelp's api v3
    "access_token": "idDL1CnoBdImHLJDs47gZd-M1DOTT9n8ohJGOkHLBgzQImhg2g01apfxlyuwdw3_J90YAatjqtfY05wxoQa1wdX_I-wtu1Ip06DrfBcpQvdPTSymkhHrqrHLSSSOWXYx",
    "expires_in": 15541272,
    "token_type": "Bearer"
};

var yelpAPI = {
  "clientId": "VDBwt4UekLscXB0EYgLdMA",
  "clientSecret": "Up3hIIu55452mnHkpLkbpHPVF0xMkQzTa8jzBq7UTv9fdgeafqgby7x1vX3jl9P2"
};

var yelpPhoneSearch = "https://api.yelp.com/v3/businesses/search/phone?phone=";

// Yelp v3 api doesn't support CORS, need to use this 3rd party proxy service
var cors_anywhere_url = "https://cors-anywhere.herokuapp.com/";

// Hide/Show right sidebar function
function menuIcon() {
    $("#menu_icon").toggleClass("change");
    menuIconState = document.getElementById("menu_icon").classList.contains("change");
    if (menuIconState) { // True or False?
      document.getElementById("right_sidebar").style.height = "100%"; // if True
      document.getElementById("right_sidebar").style.transition = "0.5s";
    } else {
      document.getElementById("right_sidebar").style.height = "60px"; // if False
    }
}

// Expand left sidebar function
function openSideBar() {
    document.getElementById("options-box").style.left = "0px";
    document.getElementById("options-box").style.transition = "0.5s";
}

// Collapse left sidebar function
function closeSideBar() {
    document.getElementById("options-box").style.left = "-310px";
    document.getElementById("options-box").style.transition = "0.5s";
}

var map;

// Create a new blank array for all the listing markers.
var markers = [];

// This global polygon variable is to ensure only ONE polygon is rendered.
var polygon = null;

// Create placemarkers array to use in multiple functions to have control
// over the number of places that show.
var placeMarkers = [];

// This function takes in a COLOR, and then creates a new marker
// icon of that color.
function makeMarkerIcon(markerColor) {
  var markerImage = new google.maps.MarkerImage(
    'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
    '|40|_|%E2%80%A2',
    new google.maps.Size(43, 77),   // Size
    new google.maps.Point(0, 0),    // Origin
    new google.maps.Point(12.5, 40),  // Anchor
    new google.maps.Size(25, 40));  // scaledSize
  return markerImage;
}

// This function will loop through the markers array and display them all.
function showListings() {
  var bounds = new google.maps.LatLngBounds();
  // Extend the boundaries of the map for each marker and display the marker
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
    bounds.extend(markers[i].position);
  }

  google.maps.event.addDomListener(window, 'resize', function() {
    map.fitBounds(bounds);
  });  // map markers always fit on screen as user resizes their browser window
}

// This function will loop through the listings and hide them all.
function hideMarkers(markers) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
  }

function initMap() {
  // Constructor creates a new map - only center and zoom are required.
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 40.7413549, lng: -73.9980244},
    zoom: 13,
    mapTypeControl: true
  });

  var largeInfowindow = new google.maps.InfoWindow();

  // Getting schools' names and lat, long coordinates from Google's JSONs
  $.getJSON('/locations.json').fail(function(){  // Error handling
    alert("Can't load locations. Check your internet connection");
  }).then(data =>  // data is the result of getJSON
      Promise.all(data.map(school =>   //  map() method creates a new array with the results of calling a provided function on every element in the calling array
          $.ajax({  // ajax is asynchrorous by default
              "url": cors_anywhere_url + yelpPhoneSearch + school.phone,
              "method": "GET",
              "headers": {
                  "authorization": "Bearer " + yelpToken.access_token,
                  "cache-control": "public, max-age=31536000",
              }
          }).fail(function(){
            alert("Can't fetch data from Yelp. Check your internet connection");
          }).then(response => ({ // response is the result of the ajax call above
              title: school.title,
              location: school.location,
              phone: school.phone,
              rating: response.businesses[0].rating,
              url: response.businesses[0].url
          }))

      ))
  ).then(function(value) {  // What to do with value after getJSON, ajax call, and mapping the ajax response
      // value is the array returned from the above codes, and is used to create markers below
      // The following group uses the locations array to create an array of markers on initialize.
      for (var i = 0; i < value.length; i++) {
        var marker = new google.maps.Marker({
          position: value[i].location,
          title: value[i].title,
          rating: value[i].rating,
          url: value[i].url,
          animation: google.maps.Animation.DROP,
          icon: defaultIcon,
          id: i,
        });
        value[i].marker = marker;  // Create marker property for each marker, used by KnockOutJS
        markers.push(marker);  // Push the newly created marker's to the markers array
        marker.addListener('click', populateThisWindow);
        marker.addListener('mouseover', mouseover);
        marker.addListener('mouseout', mouseout);
      }

      showListings();  // Display listings automatically on startup

      function populateThisWindow() {
        populateInfoWindow(this, largeInfowindow);
      }

      function mouseover(){
        this.setIcon(highlightedIcon);
      }

      function mouseout(){
        this.setIcon(defaultIcon);
      }

      function animateMarker(marker) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
      }

      function stopBounce(marker){
        setTimeout(function(){
          marker.setAnimation(null);
        }, 1450);  // perfect double bounce
      }

      // This function populates the infowindow when the marker is clicked. We'll only allow
      // one infowindow which will open at the marker that is clicked, and populate based
      // on that markers position.
      function populateInfoWindow(marker, infowindow) {
        animateMarker(marker); // Bounce markers
        stopBounce(marker);
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow.marker != marker) {
          // Clear the infowindow content to give the streetview time to load.
          infowindow.setContent('');
          infowindow.marker = marker;
          // Make sure the marker property is cleared if the infowindow is closed.
          infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
          });
          var streetViewService = new google.maps.StreetViewService();
          var radius = 50;

          // In case the status is OK, which means the pano was found, compute the
          // position of the streetview image, then calculate the heading, then get a
          // panorama from that and set the options
          var streetView = function getStreetView(data, status) {
            var info = '<div>' + marker.title +
              '</div><div><a target="_blank" href="' + marker.url + '">Yelp Rating: ' +
              marker.rating + '</a></div><div id="pano"></div>';
            if (status == google.maps.StreetViewStatus.OK) {
              var nearStreetViewLocation = data.location.latLng;
              var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
              infowindow.setContent(info);
              var panoramaOptions = {
                position: nearStreetViewLocation,
                pov: {
                  heading: heading,
                  pitch: 30
                }
              };
              var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
              infowindow.setContent('<div>' + marker.title + '</div>' +
                '<div>No Street View Found</div><a target="_blank" href="' +
                marker.url + '">Yelp Rating: ' + marker.rating + '</a>');
            }
          };
          // Use streetview service to get the closest streetview image within
          // 50 meters of the markers position
          streetViewService.getPanoramaByLocation(marker.position, radius, streetView);
          // Open the infowindow on the correct marker.
          infowindow.open(map, marker);
        }
      }

      // Using KnockOutJS for filtering function
      function FunctionsVM() {
        var self = this;
        self.locations = ko.observableArray(value);
        self.filter = ko.observable('');
        self.filtered = ko.computed(function() {
          var filter = self.filter().toLowerCase();
          if (!filter) { // If no filter was entered by user, show all locations
            ko.utils.arrayForEach(self.locations(), function(item){
              item.marker.setVisible(true);
            });
            return self.locations();
          }
          else { // Show only the filtered locations
            return ko.utils.arrayFilter(self.locations(), function(item){
              var result = (item.title.toLowerCase().search(filter) >= 0);
              // result is always true if user type something in
              item.marker.setVisible(result);
              return result;
            });
          }
        }, self);

        // Toggle markers Bounce animation when user clicks school in the list
        self.placeClick = function(clicked) {
          if (clicked.marker.getAnimation() !== null) {
            clicked.marker.setAnimation(null);
          } else {
            clicked.marker.setAnimation(google.maps.Animation.BOUNCE);
            stopBounce(clicked.marker);
          }
          populateInfoWindow(clicked.marker, largeInfowindow);
        };
        self.showSchools = function(){showListings();};
        self.hideSchools = function(){hideMarkers(markers);};
        self.draw = function(){toggleDrawing(drawingManager);};
        self.timeSearch = function(){searchWithinTime();};
        self.placeSearch = ko.observable('');

        self.goPlaces = ko.computed(function textSearchPlaces() {
          var bounds = map.getBounds();
          hideMarkers(placeMarkers);
          var placesService = new google.maps.places.PlacesService(map);
          // Get the address or place that the user entered.
          var search = placeSearch;
          // Make sure the search isn't blank.
          if (search === '') {
            window.alert('You must enter something to be searched');
          } else {
            placesService.textSearch({
              query: placeSearch,
              bounds: bounds
            }, function(results, status) {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                createMarkersForPlaces(results);
              }
            });
          }
        }, self);



      }
      // Apply KnockOutJS
      ko.applyBindings(new FunctionsVM());
  });

  // This autocomplete is for use in the search within time entry box.
  var timeAutocomplete = new google.maps.places.Autocomplete(
      document.getElementById('search-within-time-text'));
  // Create a searchbox in order to execute nearby places search
  var searchBox = new google.maps.places.SearchBox(
      document.getElementById('places-search'));

  // Bias the boundaries within the map for the zoom to area text
  // and search within time and searchBox
  timeAutocomplete.bindTo('bounds', map);
  searchBox.bindTo('bounds', map);

  // Listen for the event fired when the user selects a prediction from the
  // picklist and retrieve more details for that place.
  searchBox.addListener('places_changed', function() {
    searchBoxPlaces(this);
  });

  // Initialize the drawing manager.
  var drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_LEFT,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYGON
      ]
    }
  });

  // Style the markers a bit. This will be our listing marker icon.
  var defaultIcon = makeMarkerIcon('ff6666');

  // Create a "highlighted location" marker color for when the user
  // mouses over the marker.
  var highlightedIcon = makeMarkerIcon('0275d8');

  // Add an event listener so that the polygon is captured,  call the
  // searchWithinPolygon function. This will show the markers in the polygon,
  // and hide any outside of it.
  drawingManager.addListener('overlaycomplete', function(event) {
    // First, check if there is an existing polygon.
    // If there is, get rid of it and remove the markers
    if (polygon) {
      polygon.setMap(null);
      hideMarkers(markers);
    }
    // Switching the drawing mode to the HAND (i.e., no longer drawing).
    drawingManager.setDrawingMode(null);
    // Creating a new editable polygon from the overlay.
    polygon = event.overlay;
    polygon.setEditable(true);
    // Searching within the polygon.
    searchWithinPolygon(polygon);
    // Make sure the search is re-done if the poly is changed.
    polygon.getPath().addListener('set_at', searchWithinPolygon);
    polygon.getPath().addListener('insert_at', searchWithinPolygon);
  });
}

// This shows and hides (respectively) the drawing options.
function toggleDrawing(drawingManager) {
  if (drawingManager.map) {
    drawingManager.setMap(null);
    // In case the user drew anything, get rid of the polygon
    if (polygon !== null) {
      polygon.setMap(null);
    }
  } else {
    drawingManager.setMap(map);
  }
}

// This function hides all markers outside the polygon,
// and shows only the ones within it. This is so that the
// user can specify an exact area of search.
function searchWithinPolygon() {
  for (var i = 0; i < markers.length; i++) {
    if (google.maps.geometry.poly.containsLocation(markers[i].position, polygon)) {
      markers[i].setMap(map);
    } else {
      markers[i].setMap(null);
    }
  }
}

// This function allows the user to input a desired travel time, in
// minutes, and a travel mode, and a location - and only show the listings
// that are within that travel time (via that travel mode) of the location
function searchWithinTime() {
  // Initialize the distance matrix service.
  var distanceMatrixService = new google.maps.DistanceMatrixService();
  var address = document.getElementById('search-within-time-text').value;
  // Check to make sure the place entered isn't blank.
  if (address === '') {
    window.alert('You must enter an address.');
  } else {
    hideMarkers(markers);
    // Use the distance matrix service to calculate the duration of the
    // routes between all our markers, and the destination address entered
    // by the user. Then put all the origins into an origin matrix.
    var origins = [];
    for (var i = 0; i < markers.length; i++) {
      origins[i] = markers[i].position;
    }
    var destination = address;
    var mode = document.getElementById('mode').value;
    // Now that both the origins and destination are defined, get all the
    // info for the distances between them.
    distanceMatrixService.getDistanceMatrix({
      origins: origins,
      destinations: [destination],
      travelMode: google.maps.TravelMode[mode],
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    }, function(response, status) {
      if (status !== google.maps.DistanceMatrixStatus.OK) {
        window.alert('Error was: ' + status);
      } else {
        displayMarkersWithinTime(response);
      }
    });
  }
}

// This function will go through each of the results, and,
// if the distance is LESS than the value in the picker, show it on the map.
function displayMarkersWithinTime(response) {
  var maxDuration = document.getElementById('max-duration').value;
  var origins = response.originAddresses;
  var destinations = response.destinationAddresses;
  // Parse through the results, and get the distance and duration of each.
  // Because there might be  multiple origins and destinations we have a nested loop
  // Then, make sure at least 1 result was found.
  var atLeastOne = false;
  for (var i = 0; i < origins.length; i++) {
    var results = response.rows[i].elements;
    for (var j = 0; j < results.length; j++) {
      var element = results[j];
      if (element.status === "OK") {
        // The distance is returned in feet, but the TEXT is in miles. If we wanted to switch
        // the function to show markers within a user-entered DISTANCE, we would need the
        // value for distance, but for now we only need the text.
        var distanceText = element.distance.text;
        // Duration value is given in seconds so we make it MINUTES. We need both the value
        // and the text.
        var duration = element.duration.value / 60;
        var durationText = element.duration.text;
        if (duration <= maxDuration) {
          //the origin [i] should = the markers[i]
          markers[i].setMap(map);
          atLeastOne = true;
          // Create a mini infowindow to open immediately and contain the
          // distance and duration
          var infowindow = new google.maps.InfoWindow({
            content: durationText + ' away, ' + distanceText +
              '<div><input type=\"button\" value=\"View Route\" onclick =' +
              '\"displayDirections(&quot;' + origins[i] + '&quot;);\"></input></div>'
          });
          infowindow.open(map, markers[i]);
          // Put this in so that this small window closes if the user clicks
          // the marker, when the big infowindow opens
          markers[i].infowindow = infowindow;
          google.maps.event.addListener(markers[i], 'click', function() {
            this.infowindow.close();
          });
        }
      }
    }
  }
  if (!atLeastOne) {
    window.alert('We could not find any locations within that distance!');
  }
}

// This function is in response to the user selecting "show route" on one
// of the markers within the calculated distance. This will display the route
// on the map.
function displayDirections(origin) {
  hideMarkers(markers);
  var directionsService = new google.maps.DirectionsService();
  // Get the destination address from the user entered value.
  var destinationAddress =
      document.getElementById('search-within-time-text').value;
  // Get mode again from the user entered value.
  var mode = document.getElementById('mode').value;
  directionsService.route({
    // The origin is the passed in marker's position.
    origin: origin,
    // The destination is user entered address.
    destination: destinationAddress,
    travelMode: google.maps.TravelMode[mode]
  }, function(response, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      var directionsDisplay = new google.maps.DirectionsRenderer({
        map: map,
        directions: response,
        draggable: true,
        polylineOptions: {
          strokeColor: 'green'
        }
      });
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

// This function fires when the user selects a searchbox picklist item.
// It will do a nearby search using the selected query string or place.
function searchBoxPlaces(searchBox) {
  hideMarkers(placeMarkers);
  var places = searchBox.getPlaces();
  if (places.length === 0) {
    window.alert('We did not find any places matching that search!');
  } else {
  // For each place, get the icon, name and location.
    createMarkersForPlaces(places);
  }
}

// This function firest when the user select "go" on the places search.
// It will do a nearby search using the entered query string or place.
// function textSearchPlaces() {
//   var bounds = map.getBounds();
//   hideMarkers(placeMarkers);
//   var placesService = new google.maps.places.PlacesService(map);
//   // Get the address or place that the user entered.
//   var search = document.getElementById('places-search').value;
//   // Make sure the search isn't blank.
//   if (search === '') {
//     window.alert('You must enter something to be searched');
//   } else {
//     placesService.textSearch({
//       query: document.getElementById('places-search').value,
//       bounds: bounds
//     }, function(results, status) {
//       if (status === google.maps.places.PlacesServiceStatus.OK) {
//         createMarkersForPlaces(results);
//       }
//     });
//   }
// }

// This function creates markers for each place found in either places search.
function createMarkersForPlaces(places) {
  var bounds = new google.maps.LatLngBounds();
  for (var i = 0; i < places.length; i++) {
    var place = places[i];
    var icon = {
      url: place.icon,
      size: new google.maps.Size(35, 35),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(15, 34),
      scaledSize: new google.maps.Size(25, 25)
    };
    // Create a marker for each place.
    var marker = new google.maps.Marker({
      map: map,
      icon: icon,
      title: place.name,
      position: place.geometry.location,
      id: place.place_id
    });
    // Create a single infowindow to be used with the place details information
    // so that only one is open at once.
    var placeInfoWindow = new google.maps.InfoWindow();
    placeMarkers.push(marker);
    if (place.geometry.viewport) {
      // Only geocodes have viewport.
      bounds.union(place.geometry.viewport);
    } else {
      bounds.extend(place.geometry.location);
    }
  }

  placeMarkers.forEach(function(marker){
    // If a marker is clicked, do a place details search on it in the next function.
    marker.addListener('click', function() {
      if (placeInfoWindow.marker == this) {
        console.log("This infowindow already is on this marker!");
      } else {
        getPlacesDetails(this, placeInfoWindow);
      }
    });
  });

  map.fitBounds(bounds);
}

// This is the PLACE DETAILS search - it's the most detailed so it's only
// executed when a marker is selected, indicating the user wants more
// details about that place.
function getPlacesDetails(marker, infowindow) {
  var service = new google.maps.places.PlacesService(map);
  service.getDetails({
    placeId: marker.id
  }, function(place, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      // Set the marker property on this infowindow so it isn't created again.
      infowindow.marker = marker;
      var innerHTML = '<div>';
      if (place.name) {
        innerHTML += '<strong>' + place.name + '</strong>';
      }
      if (place.formatted_address) {
        innerHTML += '<br>' + place.formatted_address;
      }
      if (place.formatted_phone_number) {
        innerHTML += '<br>' + place.formatted_phone_number;
      }
      if (place.opening_hours) {
        innerHTML += '<br><br><strong>Hours:</strong><br>' +
            place.opening_hours.weekday_text[0] + '<br>' +
            place.opening_hours.weekday_text[1] + '<br>' +
            place.opening_hours.weekday_text[2] + '<br>' +
            place.opening_hours.weekday_text[3] + '<br>' +
            place.opening_hours.weekday_text[4] + '<br>' +
            place.opening_hours.weekday_text[5] + '<br>' +
            place.opening_hours.weekday_text[6];
      }
      if (place.photos) {
        innerHTML += '<br><br><img src="' + place.photos[0].getUrl(
            {maxHeight: 200, maxWidth: 400}) + '">';
      }
      innerHTML += '</div>';
      infowindow.setContent(innerHTML);
      infowindow.open(map, marker);
      // Make sure the marker property is cleared if the infowindow is closed.
      infowindow.addListener('closeclick', function() {
        infowindow.marker = null;
      });
    }
  });
}

// Map loading error handle
function scriptsLoadError(){
    alert("Error loading scripts. Check your internet connection");
}

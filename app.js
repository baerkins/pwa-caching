// Refs
// https://developers.google.com/web/fundamentals/push-notifications/
// https://developers.google.com/web/fundamentals/push-notifications/display-a-notification

// Register and install Service Worker
// -----------------------------------
if ('serviceWorker' in navigator) {

  // Checks if there's already a serviceWorker in control
  if (!navigator.serviceWorker.controller) {
    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/'
      })
      .then(function (reg) {
        if (reg.installing) {
          console.log('Service worker installing');
        } else if (reg.waiting) {
          console.log('Service worker installed');
        } else if (reg.active) {
          console.log('Service worker active');
        }
      })
      .catch(function (error) {
        // registration failed
        console.log('Registration failed with ' + error);
      });
  }
}


// Vapid Key
// ---------
var vapidPublicKey = 'BL23yeb92L1CeXZ8ID6mk6GYEDKrN0Y6dWXyvyz5JCD2EsPNq_eyiZR-T_adK29aPpjVaVIJOYN2h5uaR8luaGU';


// Configure the Subscription
// --------------------------
function requestSubscription() {

  // Bail if there isn't a service worker
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Hold for a future registration object
  var reg;

  // When the service worker is ready, attempt to create a subscription
  navigator.serviceWorker.ready
    .then(function (swreg) {
      reg = swreg;
      return swreg.pushManager.getSubscription();
    })
    .then(function (sub) {

      // Create a new subscription if one does not already exist
      if (sub === null) {

        // console.log('Subscription does not exist');

        // Encode the Vapid key to Uint8Array
        var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);

        // Create a subscription
        return reg.pushManager.subscribe({
          userVisibleOnly: true,                        // Must be true: https://developers.google.com/web/fundamentals/push-notifications/subscribing-a-user#uservisibleonly_options
          applicationServerKey: convertedVapidPublicKey
        });

      } else {

        // We have a subscription
        // console.log('Existing subscription:', sub);

        return sub;

      }
    })
    .then(function (newSub) {
      console.log('New Subscription Object:', newSub);
      var sub = JSON.stringify({ subscription: newSub });

      // Send subscription object to the endpoint of the server
      return fetch('https://dev-philly-pwa.pantheonsite.io/subscribe/app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'no-cors',
        body: sub
      })
    })
    .then(function (res) {
      if (res.ok) {
        // Do response ok stuff
        // displayConfirmNotification();
      }
    })
    .catch(function (err) {
      // Log errors
      console.log(err);
    });
}

requestSubscription();


// Display Notifications
// ---------------------
navigator.serviceWorker.addEventListener('message', function (event) {

  if (event.data) {
    data = JSON.parse(event.data);
    console.log(data);

    // If message is passed
    if (data.msg) {
      let showMsg;

      clearTimeout(showMsg);

      // Add message content to alert box, display alert box
      document.getElementById('alert-message').innerHTML = data.msg;
      document.getElementById('alert-box').classList.add('visible');
      showMsg = setTimeout(function() {
        document.getElementById('alert-box').classList.remove('visible');
      }, 10000);

    // Notification
    } else if (data.title) {

      // Wait for the service worker
      navigator.serviceWorker.ready

        // Build notification options
        // https://tests.peter.sh/notification-generator/
        .then(function (swreg) {

          var options = {
            body: data.body
          };

          if (data.tag) {
            options.tag = data.tag;
          }

          if (data.dir) {
            options.dir = data.dir;
          }

          if (data.lang) {
            options.lang = data.lang;
          }

          if (data.icon) {
            options.icon = data.icon;
          }

          if (data.renotify && data.renotify == "true") {
            options.renotify = true;
          }

          swreg.showNotification(data.title, options);
        });
    }
  }

});





// Encode a Vapid key to Uint8Array
// --------------------------------
function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}




/********************
 ** Start Site
 ********************/

// Function for loading each image via XHR
function imgLoad(data) {
  // return a promise for an image loading
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open('GET', data.image);
    request.responseType = 'blob';

    request.onload = function() {
      if (request.status == 200) {
        var arrayResponse = [];
        arrayResponse[0] = request.response;
        arrayResponse[1] = data;
        resolve(arrayResponse);
      } else {
        reject(
          Error(
            "Image didn't load successfully; error code:" + request.statusText
          )
        );
      }
    };

    request.onerror = function() {
      reject(Error('There was a network error.'));
    };

    // Send the request
    request.send();
  });
}

// Pulled 'characters' from an external js to keep this page clean.
const charactersContainer = document.querySelector('.characters');
const loader = document.querySelector('.loader');

function generateCard(response) {
  const blob = response[0];
  const data = response[1];

  // Create image source from Blob Object
  const imageURL = window.URL.createObjectURL(blob);
  const html = `
    <div class="char">
      <div class="char-photo"><img class="char-photo" src="${imageURL}"></div>
      <div class="char-profile">
        <h3 class="char-name">${data.name}</h3>
        <div class="char-stats">
          <p class="char-item"><strong>Birth Year:</strong> ${
            data.birth_year
          }</p>
          <p class="char-item"><strong>Gender:</strong> ${data.gender}</p>
        </div>
      </div>
    </div>
  `;
  const frag = document.createRange().createContextualFragment(html);

  return frag;
}

// Build character cards on load
window.onload = function() {
  // load each set of image, alt text, name and caption
  for (let i = 0; i < characters.length; i++) {
    imgLoad(characters[i]).then(
      arrayResponse => {
        // Hide loading spinner when page loads
        if (loader) {
          loader.classList.add('hide');
        }

        const card = generateCard(arrayResponse);
        charactersContainer.appendChild(card);
      },
      Error => console.log(Error)
    );
  }
};

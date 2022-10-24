import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app-check.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.9.4/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlevv8725Ed0r5rt80NO45y__kFIRBohc",
  authDomain: "twitter-4fd0f.firebaseapp.com",
  databaseURL: "https://twitter-4fd0f-default-rtdb.firebaseio.com",
  projectId: "twitter-4fd0f",
  storageBucket: "twitter-4fd0f.appspot.com",
  messagingSenderId: "218529124530",
  appId: "1:218529124530:web:d7fb28f481d052bd3879ab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let db = rtdb.getDatabase(app);
let tweetRef = rtdb.ref(db, "/tweet");
let dataRef = rtdb.ref(db, '/data');
let thisUserRef;

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LfQ4vwhAAAAAJjdOWg1Xn-G1iJnWjgWatKrgJJD'),
  isTokenAutoRefreshEnabled: true
});



let renderer = () => {
  let url = document.location.pathname.split('/');
  // console.log(document.location.pathname)

  if (document.location.pathname == "/") {
    $("#main-col").show()
    $("#other").hide()
    renderTweets()
  }

  else if (url[1] == 'tweet' && url[2] != "") {
    $("#main-col").show()
    $("#other").hide()
    renderSingleTweet(url[2])
  }

  else if (document.location.pathname == "/login") {
    $("#main-col").hide()
    $("#other").show()
    renderLogin()
  }

  else if (document.location.pathname == "/signup") {
    $("#main-col").hide()
    $("#other").show()
    renderSignUp()
  }

  else {
    render404();
  }
}

let deleteTweet = (aTweetRef, uid) => {
  rtdb.runTransaction(aTweetRef, (tObj) => {
    if (tObj.auth_uuid == uid || !tObj) {
      tObj = {}
    }

    else if (tObj.auth_uuid != uid) {
      alert("This isnt yours -_-")
    }
    return tObj;
  });
}

let toggleLike = (aTweetRef, uid) => {
  rtdb.runTransaction(aTweetRef, (tObj) => {
    if (!tObj) {
      tObj.likes = 0;

    }
    else if (tObj.likes && tObj.likes_by_user[uid]) {
      tObj.likes--;
      tObj.likes_by_user[uid] = null;
    } else {
      tObj.likes++;
      if (!tObj.likes_by_user) {
        tObj.likes_by_user = {};
      }
      tObj.likes_by_user[uid] = true;
    }
    return tObj;
  });
}

window.onload = () => {
  renderer()
}

window.addEventListener('popstate', () => {
  renderer()
});

const auth = getAuth();
// signOut(auth);
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    thisUserRef = rtdb.ref(db, "/user/" + uid);
    rtdb.get(thisUserRef).then((ss) => {
      $(".nav-button").hide();
      $("#nav-username").html(ss.val().displayname);
      $("#nav-username").show();
    });

  }
  else {
    $(".nav-button").show();
    $("#nav-username").hide();
  }
});

let sanitizeStringJs = (input) => {
  return String(input).replace(/[^\w. ]/gi, function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
};

let sanitizeStringHTML = (input) => {
  return String(input).replace(/[^\w. ]/gi, function (c) {
    return '&#' + c.charCodeAt(0) + ';';
  });
};

rtdb.onChildRemoved(tweetRef, ss => {
  let key = ss.key
  $("#" + key).remove();
});

$("#post").on("click", () => {

  let userMessage = sanitizeStringHTML($("#userMessage").val());

  rtdb.get(thisUserRef).then((ss) => {
    let isEmpty = true;
    let name = ss.val().name;
    let username = ss.val().displayname;

    if (userMessage == "") {
      $("#userMessage").addClass("is-invalid");
    }
    else {
      $("#userMessage").removeClass("is-invalid");
      isEmpty = false;
    };

    if (!isEmpty) {
      let newTweet = {
        author: name,
        message: userMessage,
        username: "@" + username,
        likes: 0,
        time: new Date().getTime(),
        auth_uuid: auth.lastNotifiedUid
      }

      let newTweetRef = rtdb.push(tweetRef);
      rtdb.set(newTweetRef, newTweet);
      $("#userMessage").val("");
    }
  });
});

let renderTweets = () => {
  $("#main").html("")

  rtdb.onChildAdded(tweetRef, ss => {
    $('#placeholder-card').remove();
    let thisTweetRef = rtdb.ref(db, "/tweet/" + ss.key);

    $("#main").prepend(`
      <section class="tweet-card" id="${ss.key}"">
        <hr class="text-muted">
        <div class="card bg-black text-light">
          <div class="card-body gap-3">
            <h5 class="card-title" id='tweet-author'>${ss.val().author}</h5>
            <h6 class="card-subtitle mb-2 text-muted" id='tweet-username'>${ss.val().username}</h6>
            <br>
            <p class="card-text" id='tweet-message'>${ss.val().message}</p>
            <p class="text-muted" id="likes">Likes: ${ss.val().likes}</p>
            <a href="#" class="btn btn-primary" id='like'>Like</a>
            <a href="#" class="btn btn-secondary" id='delete'>Delete</a>
          </div>
        </div>
      </section>
    `);

    $(".tweet-card").off("click");

    $("#delete").on("click", (evt) => {
      evt.stopPropagation();
      deleteTweet(thisTweetRef, auth.lastNotifiedUid);
    });

    $(".tweet-card").on("click", (evt) => {
      evt.stopPropagation();
      renderSingleTweet($(evt.currentTarget).closest("section").attr("id"));
    });

    $("#like").on("click", (evt) => {
      evt.stopPropagation();
      toggleLike(thisTweetRef, ss.key)
    });
  });
};

let renderSingleTweet = (tweetUUID) => {

  let newPath = `/tweet/${tweetUUID}`;
  history.pushState(null, `Twitter`, newPath);

  let singleTweetRef = rtdb.ref(db, "/tweet/" + tweetUUID);
  rtdb.get(singleTweetRef).then((ss) => {
    if (ss.val() != null) {
      $("#main").html(`
        <section class="tweet-card" id="${tweetUUID}"">
          <hr class="text-muted">
          <div class="card bg-black text-light">
            <div class="card-body gap-3">
              <h5 class="card-title" id='tweet-author'>${ss.val().author}</h5>
              <h6 class="card-subtitle mb-2 text-muted" id='tweet-username'>${ss.val().username}</h6>
              <br>
              <p class="card-text" id='tweet-message'>${ss.val().message}</p>
              <p class="text-muted" id="likes">Likes: ${ss.val().likes}</p>
              <a href="#" class="btn btn-primary" id='like'>Like</a>
              <a href="#" class="btn btn-secondary" id='delete'>Delete</a>
            </div>
          </div>
        </section>
      `);
    }
    else {
      render404()
    }
  });
};

$("#sign-out").on('click', () => {
  signOut(auth);
  thisUserRef = null;
});

$("#home-login").on("click", () => {
  history.pushState(null, `Twitter - Log In`, `/login`);
  renderer()
});

$("#home-register").on("click", () => {
  history.pushState(null, `Twitter - Sign Up`, "/signup")
  renderer()
});

let renderLogin = () => {
  $("#other").html(`
  <br>
    <div id="liveAlertPlaceholder"></div>
  <body class="bg-dark p-3" id="main">
    <div class="container-sm">
        <div class="form-floating mb-3">
            <input type="email" class="form-control" id="email-login" placeholder="name@example.com">
            <label for="floatingInput-login">Email address</label>
        </div>
        <div class="form-floating">
            <input type="password" class="form-control" id="password-login" placeholder="Password">
            <label for="floatingPassword-login">Password</label>
        </div>
        <br>
        <button class="btn btn-primary" id="login-button">Login</button>
    </div>
  </body>`);

  $("#login-button").on("click", () => {
    //CHECK FORMS

    const alertPlaceholder = document.getElementById('liveAlertPlaceholder')
    const alert = (message, type) => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
      ].join('')

      alertPlaceholder.append(wrapper)
    }

    signInWithEmailAndPassword(auth, $("#email-login").val(), $("#password-login").val())
      .then((userCredential) => {
        const user = userCredential.user;
        location.href = "/"
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        if (errorCode == "auth/invalid-email" || errorCode == "auth/internal-error") {
          alert("Incorrect Email or Password", "danger")
        }
        else if (errorCode == "auth/user-not-found") {
          alert("Invlaid Username/Password", "danger")
        }
        console.log(error.code);
      });
  });
};

let renderSignUp = () => {
  $("#other").html(`
    <br>
    <div id="liveAlertPlaceholder"></div>
    <body class="bg-dark p-3">
      <div class="form-floating mb-3 has-validation">
          <input type="email" class="form-control" id="email-register" placeholder="name@example.com" requireed>
          <label for="floatingEmail">Email address</label>
      </div>

      <div class="row g-2 mb-3">
          <div class="col-md">
            <div class="form-floating">
              <input type="text" class="form-control" id="name-register" placeholder="name@example.com">
              <label for="floatingInputGrid">First Name</label>
            </div>
          </div>
          <div class="col-md">
            <div class="form-floating">
              <div class="input-group">
                  <span class="input-group-text">@</span>
                  <div class="form-floating">
                    <input type="text" class="form-control" id="username-register" placeholder="Username">
                    <label for="floatingInputGroup1">Username</label>
                  </div>
                </div>
            </div>
          </div>
        </div>

      <div class="form-floating mb-3">
          <input type="password" class="form-control" id="password-register" placeholder="Password">
          <label for="floatingPassword">Password</label>
      </div>
    
      <br>
      <button class="btn btn-primary" id="register-button" type='submit'>Sign Up</button>
    </body>`
  );

  $("#register-button").on("click", (evt) => {
    //CHECK FORMS
    let validUsername = false;
    const alertPlaceholder = document.getElementById('liveAlertPlaceholder')
    const alert = (message, type) => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
      ].join('')

      alertPlaceholder.append(wrapper)
    }

    let safeUserName = sanitizeStringHTML($("#username-register").val()).toLowerCase();
    let safeName = sanitizeStringHTML($("#name-register").val());

    rtdb.get(dataRef).then((ss) => {
      if (safeUserName in ss.val()) {
        evt.stopPropagation();
        alert("Username is taken.", "danger");
      }
      else {
        validUsername = true;
      }
    
      if (validUsername == true) {
        createUser(safeName, safeUserName, $("#email-register").val(), $("#password-register").val());
        history.pushState(null, `Twitter`, "/")
        renderTweets()
      }
    });
  });
};

let createUser = (safeName, safeUserName, email, password) => {
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      
      const user = userCredential.user;
      let uid = user.uid
      /*
      providerld, proactiveRefresh, reloadUserInfo, reloadListener, uid, auth, stsTokenManager,
      accessToken, displayName, email, emailVerified, phoneNumber, photoURL, isAnonymous,
      tenantid, providerData, metadata
      */
      
      let newUserRef = rtdb.ref(db, "/user/" + uid);

      let newUser = {
        name: safeName,
        displayname: safeUserName
      }
      console.log(uid)
      rtdb.update(dataRef, { [safeUserName]: uid })
      console.log("Madeir")
      rtdb.set(newUserRef, newUser);

    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;

      if (errorCode == 'auth/invalid-email') {
        alert("Invalid Email.", "danger");
      }
      else if (errorCode == "auth/weak-password") {
        alert("Password too weak.", "danger");
      }
      else if (errorCode == 'auth/email-already-in-use') {
        alert("Email already in use.", 'danger');
      }
    });
}

let render404 = () => {
  $("#center-col").html(`
    <h1 class="text-muted p5">Sorry, The page you are looking for can not be found.</h1>
  `)
}
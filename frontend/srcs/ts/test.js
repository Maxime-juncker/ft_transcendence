var btn = document.getElementById("submit_btn");
if (btn) {
    btn.addEventListener('click', submit_new_user);
}
else {
    console.error("no submit btn found !");
}
function submit_new_user() {
    var _a, _b;
    var passw = (_a = document.getElementById("passw")) === null || _a === void 0 ? void 0 : _a.nodeValue;
    var username = (_b = document.getElementById("username")) === null || _b === void 0 ? void 0 : _b.nodeValue;
    var email = document.getElementById("email").value;
    console.log(email);
    console.log(passw);
    console.log(username);
}

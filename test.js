process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var response = await fetch("https://localhost:8081/api/user/create_guest", {
	method: "POST"
})

var data = await response.json();
console.log(data, data.token);


response = await fetch("https://localhost:8081/api/user/get_profile_token", {
	method: "POST",
	headers: {
		'content-type': 'application/json'
	},
	body: JSON.stringify({
		token: data.token
	})
});
var data = await response.json();
console.log(data);

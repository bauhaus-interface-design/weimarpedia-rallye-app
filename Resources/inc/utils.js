var utils = {};

utils.networkState = {};
utils.network      = {};
utils.network.wifi = false;

utils.checkNetworkState = function() {

	utils.networkState.online    = Titanium.Network.online;
	utils.networkState.nType     = Titanium.Network.networkType;
	utils.networkState.nTypeName = Titanium.Network.networkTypeName;

	utils.setWifi();

	Titanium.Network.addEventListener('change', function(e)
	{
		utils.networkState.nType     = e.networkType;
		utils.networkState.online    = e.online;
		utils.networkState.nTypeName = e.networkTypeName;
	
		utils.setWifi();
	
	});
}

utils.setWifi = function()
{
	if(utils.networkState.online && utils.networkState.nTypeName == 'WIFI') {
		utils.network.wifi = true;
	} else {
		utils.network.wifi = false;
	}
}

utils.randomString = function(length)
{
	var chars      = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var charsMixed = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";

	var string_length = length || 8;
	var randomstring = '';
	for (var i=0; i<string_length-1; i++) {
		var rnum = Math.floor(Math.random() * charsMixed.length);
		randomstring += charsMixed.substring(rnum,rnum+1);
	};
	rnum = Math.floor(Math.random() * chars.length);
	randomstring = chars.substring(rnum,rnum+1) + randomstring;
	return randomstring;
}

utils.checkNetworkState();
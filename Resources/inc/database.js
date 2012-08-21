var db = (function() {

	//create an object which will be our public API
	var api = {};

	//maintain a database connection we can use
	var conn = Titanium.Database.open('wprallye');

	// create missing tables
	conn.execute('CREATE TABLE IF NOT EXISTS "places" ("uid" INTEGER,"name" VARCHAR,"description" TEXT,"image" BLOB,"lat" NUMERIC,"lng" NUMERIC,"accuracy" INTEGER);');
	conn.execute('CREATE TABLE IF NOT EXISTS "rallye" ("uid" INTEGER, "name" VARCHAR, "description" TEXT, "image" BLOB, "presentation" INTEGER);');
	conn.execute('CREATE TABLE IF NOT EXISTS "tasks" ("id" INTEGER PRIMARY KEY  NOT NULL ,"uid" INTEGER,"parent" INTEGER,"title" TEXT,"intro" TEXT,"instruction" TEXT,"image1" BLOB,"image2" BLOB,"image3" BLOB,"image4" BLOB,"resulttype" VARCHAR,"resultoptions" VARCHAR,"resultrequired" INTEGER,"place" INTEGER);');
	conn.execute('CREATE TABLE IF NOT EXISTS "results" ("id" INTEGER PRIMARY KEY  NOT NULL ,"taskid" INTEGER,"timestamp" DOUBLE, "result_text" TEXT, "result_photo" BLOB);');

	api.createPlace = function (data)
	{
		data.lat      = data.lat || 0;
		data.lng      = data.lng || 0;
		data.accuracy = data.accuracy || 0;
		
		conn.execute(
				"INSERT INTO places (uid, name, description, image, lat, lng, accuracy) VALUES(?, ?, ?, ?, ?, ?, ?)",
				 data.uid, data.name, data.description, data.image, data.lat, data.lng, data.accuracy
		);
		return conn.lastInsertRowId;
		
	}

	api.getPlace = function (uid)
	{
		if(uid != 'undefined') {
			var result = [];
			var resultSet = conn.execute('SELECT * FROM places WHERE uid = ' + uid);
			while (resultSet.isValidRow()) {
				result.push ({
					uid         : resultSet.fieldByName("uid"),
					name        : resultSet.fieldByName("name"),
					description : resultSet.fieldByName("description"),
					image       : resultSet.fieldByName("image"),
					lat         : resultSet.fieldByName("lat"),
					lng         : resultSet.fieldByName("lng"),
					accuracy    : resultSet.fieldByName("accuracy")
				});
				resultSet.next();
			}
			resultSet.close();
			return result;
		} else {
			return 0;
		}
	}

	api.deletePlaces = function () 
	{
		conn.execute('DELETE FROM places');
	}

	api.createRallye = function (data) 
	{
		conn.execute('DELETE FROM rallye');
		conn.execute('INSERT INTO rallye (uid,name,description,image,presentation) VALUES(' + data.uid + ',"' + data.name +'","' + data.description +'","' + data.image +'","' + data.presentation +'")');
		return conn.lastInsertRowId;
	};

	api.deleteRallye = function () 
	{
		conn.execute('DELETE FROM rallye');
	};


	api.getRallye = function() 
	{
		var result = {};
		var resultSet = conn.execute('SELECT * FROM rallye LIMIT 1');
		if (resultSet.isValidRow()) {
			result.uid          = resultSet.fieldByName("uid");
			result.name         = resultSet.fieldByName("name");
			result.description  = resultSet.fieldByName("description");
			result.image        = resultSet.fieldByName("image");
			result.presentation = resultSet.fieldByName("presentation");
		} else {
			result.uid = 0;
		}
		resultSet.close();
		return result;
	};

	api.deleteTasks = function () 
	{
		conn.execute('DELETE FROM tasks');
	};


	api.createTask = function (data)
	{
		conn.execute(
			'INSERT INTO tasks (uid, parent, title, intro, instruction, image1, image2, image3, image4, resulttype, resultoptions, resultrequired, place) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			 data.uid, data.parent, data.title, data.intro, data.instruction, data.image1, data.image2, data.image3, data.image4, data.resulttype, data.resultoptions, data.resultrequired, data.place
		);
		return conn.lastInsertRowId;
	};

	api.getTasks = function() 
	{
		var result = [];
		var resultSet = conn.execute('SELECT * FROM tasks');
		while (resultSet.isValidRow()) {
			result.push ({
				uid            : resultSet.fieldByName("uid"),
				parent         : resultSet.fieldByName("parent"),
				title          : resultSet.fieldByName("title"),
				intro          : resultSet.fieldByName("intro"),
				instruction    : resultSet.fieldByName("instruction"),
				image1         : resultSet.fieldByName("image1"),
				//image2         : resultSet.fieldByName("image2"),
				//image3         : resultSet.fieldByName("image3"),
				//image4         : resultSet.fieldByName("image4"),
				resulttype     : resultSet.fieldByName("resulttype"),
				resultoptions  : resultSet.fieldByName("resultoptions"),
				resultrequired : resultSet.fieldByName("resultrequired"),
				place          : this.getPlace(resultSet.fieldByName("place"))
			});

			resultSet.next();
		}
		resultSet.close();
		return result;
	};

	api.createResult = function (data)
	{

		conn.execute(
			'INSERT INTO results (taskid, timestamp, result_text, result_photo) VALUES(?, ?, ?, ?)',
			 data.taskid, data.timestamp, data.result_text, data.result_photo
		);
		return conn.lastInsertRowId;
	};

	api.getResults = function(single) 
	{
		var query = '';

		if(single) {
			query += 'SELECT * FROM results WHERE taskid =' + single;
		} else {
			query += 'SELECT * FROM results';
		}

		var results = [];
		var resultSet = conn.execute(query);
		while (resultSet.isValidRow()) {
			results.push ({
				id           : resultSet.fieldByName("id"),
				taskid       : resultSet.fieldByName("taskid"),
				timestamp    : resultSet.fieldByName("timestamp"),
				result_text  : resultSet.fieldByName("result_text"),
				result_photo : resultSet.fieldByName("result_photo")
			});
			resultSet.next();
		}
		resultSet.close();
		return results;
	};

	api.deleteResults = function() 
	{
		conn.execute('DELETE FROM results');
	};

	return api;
}());
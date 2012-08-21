/*
 * Weimarpedia Klassik Rallye
 * http://weimarpedia.de/
 * 
 * Android Version 0.
 * 
 * Copyright 2011, Frank Matuse <frank.matuse@uni-weimar.de>
 * *
 * Date: 2011-07-25
 */

Titanium.include('inc/utils.js');
Titanium.include('inc/database.js');

var isAndroid = Ti.Platform.osname == 'android';

var options_web = {
	dataDomain  : 'http://weimarpedia.de/',
	dataListUrl : 'index.php?id=10&tx_wpjr_pi1[action]=listJson',
	loadDataUrl : '',
	sendDataUrl : 'index.php?id=10&tx_wpjr_pi1[action]=import&tx_wpjr_pi1[controller]=Result'
};

var options = { web : options_web };

var _debug = function (msg) 
{
	var a = Titanium.UI.createAlertDialog({
		buttonNames: ['OK']
	});
	a.setMessage(msg);
	a.show();
} 

var app = (function(o) {

	var rallye = {};

	for(var x in o) {
		if(o.hasOwnProperty(x)) {

			rallye[x] = {};

			if(x == 'web') {
				for(var xw in o.web) {
					if(o.web.hasOwnProperty(xw)) {
						rallye[x][xw] = o.web[xw];
					}
				}
			}

		}
	}

	rallye.urlStore    = 'web';
	rallye.dataDomain  = rallye[rallye.urlStore].dataDomain;
	rallye.dataListUrl = rallye[rallye.urlStore].dataListUrl;
	rallye.sendDataUrl = rallye[rallye.urlStore].sendDataUrl;

	rallye.inUse = false;
	rallye.current = {};

	rallye.mainWin = Ti.UI.createWindow({});
	rallye.mainWin.open();

	rallye.cleanUp = function()
	{

		db.deleteResults();
		db.deleteRallye();

		if('undefined' != rallye.taskData) {
			for(var i = 0; i < rallye.taskData; i++) 
			{
				var f = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, PHOTO_PREFIX + rallye.taskData[i].uid + '.png');
				if(f.exists()) {
					f.deleteFile();
				}
			}
		}

		Titanium.App.Properties.removeProperty('currentTaskIndex');
	}

	rallye.init = function() 
	{

		rallye.current = db.getRallye(); // uid, name, description, image

		if(rallye.current.uid > 0) { 

			rallye.inUse = true;
			rallye.getTasks();

			if(Titanium.App.Properties.getBool("rallye_active")) {
				if(!Titanium.App.Properties.getInt("currentTaskIndex")) {
					Titanium.App.Properties.setInt("currentTaskIndex", 0);
				} else {
					openTaskWin(Titanium.App.Properties.getInt("currentTaskIndex"));
				}
				rallye.current.active = true;
			} else {
				rallye.current.active = false;
			}

		} else {
			rallye.inUse = false;
			Titanium.App.Properties.removeProperty('currentTaskIndex');
		}

		var f = Ti.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory, 'images/wp_big.png');

		var imageView = Titanium.UI.createImageView({
			image : f,
			width : 220,
			height : 161,
			top: (Ti.Platform.displayCaps.platformHeight / 2) -160
		});

		rallye.mainWin.add(imageView);

		var btnBottom,
		animation = Titanium.UI.createAnimation({
			curve : Ti.UI.ANIMATION_CURVE_EASE_IN,
			opacity : 1,
			duration : 1000
		});

		animation.addEventListener('complete', function() {

			btnBottom = 100;


			rallye.btn_continue = Titanium.UI.createButton({
				title : 'Rallye fortsetzen',
				height : 40,
				width : 200,
				bottom : btnBottom
			});

			rallye.btn_continue.addEventListener('click', function() 
			{
				openTaskWin({ index : Titanium.App.Properties.getInt("currentTaskIndex") });
			});

			btnBottom += 60;
			rallye.mainWin.add(rallye.btn_continue);
			
			if(!rallye.inUse) {
				rallye.btn_continue.hide();
			}

			rallye.btn_new = Titanium.UI.createButton({
				title : 'Neue Rallye',
				height : 40,
				width : 200,
				bottom : btnBottom
			});

			rallye.btn_new.addEventListener('click', function() 
			{
				rallye.getRallyeList();
			});

/*
			var urlSettings = Titanium.UI.createImageView({
				url:'images/corner.png',
				width : 80,
				height: 80,
				bottom: 0,
				right: 0
			})

			urlSettings.addEventListener('singletap', function() 
			{
				rallye.urlSettingsPopup();
			});

			rallye.mainWin.add(urlSettings);
*/

			rallye.mainWin.add(rallye.btn_new);

		});

		rallye.mainWin.add(imageView);
		imageView.animate(animation);

	}

	rallye.getRallyeList = function() 
	{
		Titanium.API.info(Titanium.Platform.model);
		if(/*utils.network.wifi*/ utils.networkState.online || Titanium.Platform.model == 'google_sdk' || Titanium.Platform.model == 'sdk') { 

			var actInd = Titanium.UI.createActivityIndicator({
				message : 'Rallyes werden gesucht',
				top : 200
			});

			var ind, request = Ti.Network.createHTTPClient();

			var serverUrl = rallye.dataDomain + rallye.dataListUrl;
			request.onerror = function(e)
			{
				actInd.hide();
				Ti.UI.createAlertDialog({ 
						title: 'Network Error', 
						message: 'Unable to retrieve data.'
				}).show();
				Ti.API.info('NETWORK ERROR ' + e.error);
			};

			request.setTimeout(50000);

			request.openPath = function(path)
			{
				actInd.show();
				this.open( 'GET', serverUrl );
				this.send();
			};

			request.onload = function()
			{
				if (this.responseData != '[]')
				{
					try
					{
						var data = JSON.parse('{"result" : ' + this.responseData + '}');
					}
					catch (e)
					{
						Ti.UI.createAlertDialog({title: e.name, message: e.message}).show();
						Ti.API.debug(this.responseData);
						return;
					}
					
					var rallyeList = [];
					
					for (var i in data.result) 
					{
						switch(i) {
							default :
								if(typeof data.result[i]  == 'object') {
									var r = {};
									for (var j in data.result[i]) 
									{
										if(data.result[i][j]) {
											r[j] = data.result[i][j].toString();
										} else {
											r[j] = data.result[i][j];
										}
									}
									rallyeList.push(r);
								}
							break;
						}
					}
					if(rallyeList.length) {
						if(rallyeList.length == 1) {

							rallye.loadDataUrl = rallyeList[0].url;
							rallye.cleanUp();
							actInd.hide();
							rallye.loadData();

						} else {
							var options = [];
							var urls    = [];
							for(var i = 0; i < rallyeList.length; i++) {
								options.push(rallyeList[i].name);
								urls.push(rallyeList[i].url);
							}

							var optionsDialogOpts = {
								options: options,
								title:'Rallye auswählen',
								buttonNames : [ 'Abbrechen'] // Android only
							};

							var dialog = Titanium.UI.createOptionDialog(optionsDialogOpts);

							dialog.addEventListener('click',function(e)
							{
								if (!e.button) { // Android only

									rallye.loadDataUrl = urls[e.index];
									rallye.cleanUp();
									actInd.hide();
									rallye.loadData();

								}
							});

							dialog.show();
						}
					}
					actInd.hide();
				}
			}

			request.openPath('');
		}
	}

	rallye.loadData = function() 
	{
		if(/*utils.network.wifi*/ utils.networkState.online || Titanium.Platform.model == 'google_sdk' || Titanium.Platform.model == 'sdk') { 

			var actInd = Titanium.UI.createActivityIndicator({
				message : 'Rallye wird geladen',
				top : 200
			});

			var ind, request = Ti.Network.createHTTPClient();

			var serverUrl = rallye.dataDomain + rallye.loadDataUrl;

			request.onerror = function(e)
			{
				actInd.hide();
				Ti.UI.createAlertDialog({ 
						title: 'Network Error', 
						message: 'Unable to retrieve data.'
				}).show();
				Ti.API.info('NETWORK ERROR ' + e.error);
			};

			request.setTimeout(50000);

			request.openPath = function(path)
			{
				actInd.show();
				this.open( 'GET', serverUrl );
				this.send();
			};

			request.onload = function()
			{

				if (this.responseData != '[]')
				{
					try
					{
						var data = JSON.parse('' + this.responseData);
					}
					catch (e)
					{
						Ti.UI.createAlertDialog({title: e.name, message: e.message}).show();
						Ti.API.debug(this.responseData);
						return;
					}

					var i, j, k, rallyeData = {};

					for (i in data.rallye) 
					{
						rallyeData[i] = data.rallye[i];
					}

					db.createRallye(rallyeData);
					var r = db.getRallye();

					db.deletePlaces();
					for (i in data.rallyePlaces) 
					{
						if(typeof data.rallyePlaces[i] == 'object') {
							db.createPlace(data.rallyePlaces[i]);
						}
					}

					db.deleteTasks();
					for (i in data.tasks) 
					{
						var d = {};
						switch(i) {
							default :
								if(typeof data.tasks[i]  == 'object') {
									for (j in data.tasks[i]) 
									{
										d[j] = data.tasks[i][j];
									}
								}	
						}
						db.createTask(d);
					}

				}

				// Rallye loaded
				rallye.current = db.getRallye();
				actInd.hide();

				rallye.btn_start = Titanium.UI.createButton({
					title : 'Rallye starten',
					height : 40,
					width : 200,
					bottom: 100
				});

				rallye.start_screen = Ti.UI.createView({
					width : Ti.Platform.displayCaps.platformWidth,
					height : Ti.Platform.displayCaps.platformHeight,
					backgroundColor : '#fff',
				});

				if(rallye.current.image != '') {
					var imageView = Titanium.UI.createImageView({
						image : Titanium.Utils.base64decode(rallye.current.image),
						width : Ti.Platform.displayCaps.platformWidth,
						height : Ti.Platform.displayCaps.platformHeight,
					});
					rallye.start_screen.add(imageView);
				}

				rallye.start_screen.add(rallye.btn_start);
				rallye.mainWin.add(rallye.start_screen);

				rallye.btn_start.addEventListener('click', function() 
				{
					rallye.display('new');
					rallye.btn_continue.show();
				});

			};
			request.openPath('');

		} else {

			var a = Titanium.UI.createAlertDialog({
				title:'Ooops',
				buttonNames: ['OK']
			});
			a.setMessage('No network connection available');
			a.show();
		}

	}

	rallye.sendData = function() 
	{
		if(/*utils.network.wifi*/ utils.networkState.online || Titanium.Platform.model == 'google_sdk' || Titanium.Platform.model == 'sdk') { 

			var actInd = Titanium.UI.createActivityIndicator({
				message : 'Daten werden gesendet',
				top : 200
			});

			var ind, request = Ti.Network.createHTTPClient();

			var serverUrl = rallye.dataDomain + rallye.sendDataUrl;

			request.onerror = function(e)
			{
				actInd.hide();
				Ti.UI.createAlertDialog({ 
						title: 'Network Error', 
						message: 'Unable to retrieve data.'
				}).show();
				Ti.API.info('NETWORK ERROR ' + e.error);
			};

			request.setTimeout(50000);

			request.onload = function()
			{
				actInd.hide();
				Titanium.UI.currentWindow.close();
				Ti.UI.createAlertDialog({buttonNames: ['OK'], message: 'Die Daten wurden zur Auswertung an den Server übermittelt. Vielen Dank.'}).show();
				rallye.cleanUp();
				rallye.btn_continue.hide();
			};

			actInd.show();

			var results = db.getResults();

			if(results.length) {

				var info, tasks, files = {}, postdata = {};
			
				info  = JSON.stringify({ user: 100, login : Ti.Platform.id, groupname : '' });

				var dataObj = {};
				dataObj.tasks = [];

				for(var i = 0; i < results.length; i++) {

					var r = utils.randomString(16);
					var c = {};

					if(results[i].result_text) {
						c.text = results[i].result_text;
					}

					if(results[i].result_photo) {
						c.photo = r;
						var f = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, results[i].result_photo);
						postdata[r] = f.read();
					}

					dataObj.tasks.push({
						timestamp : Math.round(new Date()/1000),
						task : results[i].taskid,
						content : c
					})
				}
				
				tasks = JSON.stringify(dataObj);

				postdata.tasks = tasks;
				postdata.info  = info;

				request.open('POST',rallye.dataDomain + rallye.sendDataUrl);
				request.send(postdata);

			}

		} else {

			var a = Titanium.UI.createAlertDialog({
				title:'Ooops',
				buttonNames: ['OK']
			});
			a.setMessage('No network connection available');
			a.show();
		}
	}

	rallye.getTasks = function()
	{

		rallye.tasksOverview = [];
		rallye.taskData      = [];

		var tasks = db.getTasks();

		for(var i = 0; i < tasks.length; i++) 
		{
			rallye.tasksOverview.push({ 
				hasChild: true, 
				title : tasks[i].title,
				className : 'tablerow'
			});
			
			rallye.taskData.push({
				uid            : tasks[i].uid,
				parent         : tasks[i].parent,
				title          : tasks[i].title,
				intro          : tasks[i].intro,
				instruction    : tasks[i].instruction,
				resulttype     : tasks[i].resulttype,
				resultoptions  : tasks[i].resultoptions,
				resultrequired : tasks[i].resultrequired,
				place          : tasks[i].place,
				identifier     : utils.randomString(16), 
				image1         : tasks[i].image1
			})
		}
		return rallye.tasksOverview;
	}

	rallye.display = function(mode) 
	{
		rallye.rallyeWin = Ti.UI.createWindow({ 
			backgroundColor : '#FFF',
			navBarHidden : true 
		});

		switch(mode) {
			
			case 'new':
				/*
				var a = Titanium.UI.createAlertDialog({
					buttonNames: ['OK']
				});
				a.setMessage('Neue Rallye');
				a.show();
				*/
				break;

			case 'continue':
				/*
				var a = Titanium.UI.createAlertDialog({
					buttonNames: ['OK']
				});
				a.setMessage('Rallye fortsetzen');
				a.show();
				*/
				break;
			
		}

		// BODY
		var body = Ti.UI.createView({
			height : 'auto',
			layout : 'vertical',
			top : 10
		});

		var bodyView1 = Ti.UI.createView({
			backgroundColor : '#336699',
			height : 100,
			left : 10,
			right : 10
		});

		var bodyView2 = Ti.UI.createView({
			/*
			contentWidth:'auto',
			contentHeight:'auto',
			showVerticalScrollIndicator:true,
			*/
			/*backgroundColor : '#ff0000',*/
			height : Ti.Platform.displayCaps.platformHeight-215,
			left : 10,
			right : 10,
			top : 10
		});

		rallye.getTasks();

		rallye.buildTaskWin(0);

/*
		var table = Titanium.UI.createTableView({
			data : rallye.tasksOverview,
			height: Ti.Platform.displayCaps.platformHeight-215
		});
		
		table.addEventListener('click', function(e)
		{
			
			//var index = e.index;
			//var section = e.section;
			//var row = e.row;
			//var rowdata = e.rowData;


			rallye.buildTaskWin(e.index);

		});

		var labelHead = Ti.UI.createLabel({
			text : rallye.current.name,
			id : 'head'
		});

		bodyView1.add(labelHead);
		bodyView2.add(table);
		body.add(bodyView1);
		body.add(bodyView2);

		rallye.rallyeWin.add(body);

		rallye.rallyeWin.open();
*/
		switch(mode) {
			
			case 'new':

				var date_start = new Date();
				Titanium.App.Properties.setDouble("rallye_start_time", date_start.getTime());
				
				setTimeout(function()
				{
					rallye.start_screen.hide();
				},1000);


				break;

			case 'continue':

				break;
			
		}

	}

	rallye.buildTaskWin = function (index) 
	{
		Ti.App.fireEvent('openTaskWin', { index : index, task : rallye.taskData[index]});
	}

	return rallye;

}(options));

/* Global Events */

var openTaskWin = function(obj) {

	var index = obj.index || 0;
	var data  = {};

	data.task = app.taskData[index];
	Titanium.App.Properties.setInt('currentTaskIndex', index);

	var PHOTO_PREFIX = 'photo_';

	var taskWin = Ti.UI.createWindow({ 
		backgroundColor : '#deeaf3',
		navBarHidden : true,
		id : 'task'
	});

	taskWin.open();

	// BODY
	var body = Ti.UI.createView({
		height : 'auto',
		layout : 'vertical',
	});

	var bodyView0 = Ti.UI.createView({
		backgroundColor: '#333333',
		height : 30
	});
	var bodyView1 = Ti.UI.createView({
		backgroundColor: '#336699',
		height : 50
	});

var scrollView = Titanium.UI.createScrollView({
	contentWidth:'auto',
	contentHeight:'auto',
	top:0,
	showVerticalScrollIndicator:true,
	showHorizontalScrollIndicator:true,
	height: Ti.Platform.displayCaps.platformHeight-80,
});

	var bodyView2 = Ti.UI.createView({
		//height : Ti.Platform.displayCaps.platformHeight-215,
		layout : 'vertical',
		left: 0,
		right: 0
	});


	var labelRallye = Ti.UI.createLabel({
		text : 'Schritt ' + (index+1) + '/' + app.taskData.length + ' - ' + app.current.name,
		color: '#ffffff',
		font : { fontSize : 14, fontFamily : 'sans' },
		textAlign : 'left'
	});

	var labelHead = Ti.UI.createLabel({
		text : data.task.title,
		color: '#ffffff',
		font : { fontSize : 18, fontFamily : 'serif' },
		textAlign : 'center'
	});

	bodyView0.add(labelRallye);
	bodyView1.add(labelHead);


	var imgDimensions = {};
	imgDimensions.x = Ti.Platform.displayCaps.platformWidth;
	imgDimensions.y = (450 / 600) * imgDimensions.x;

	if(typeof data.task.place == 'object') {
		if(data.task.place[0].image) 
		{ 
			var imageView = Titanium.UI.createImageView({
				image : Titanium.Utils.base64decode(data.task.place[0].image),
				top : 0,
				width : imgDimensions.x,
				height: imgDimensions.y
			});
			bodyView2.add(imageView);
		}
	}

//TODO erweitern auf 4 Bilder

	//Ti.UI.createAlertDialog({message: JSON.stringify(data.task)}).show();

/*
	var scrollView = Titanium.UI.createScrollableView({
		views:views,
		showPagingControl:true,
		pagingControlHeight:20,
		maxZoomScale:1.0,
		currentPage:0,
		pagingControlColor : 'transparent'
	});

	var taskImgBox = Ti.UI.createView({
		
	});
*/
	var top = 20;
	
	if(data.task.intro) {
		var labelIntro = Ti.UI.createLabel({
			text : data.task.intro,
			//text : data.task.place[0].name,
			color: '#333',
			font : { fontSize : 20, fontFamily : 'sans' },
			textAlign : 'left',
			top : top,
			left: 20,
			right: 20
		});
		
		bodyView2.add(labelIntro);

	}

	if(data.task.image1) 
	{ 
		var imageView = Titanium.UI.createImageView({
			image : Titanium.Utils.base64decode(data.task.image1),
			top: top,
			width : imgDimensions.x,
			height: imgDimensions.y
		});
		bodyView2.add(imageView);
		var line = Ti.UI.createView({
			height: 5,
			backgroundColor: '#999'
		})
		bodyView2.add(line);
	}

	var taskBox = Ti.UI.createView({
		top: 20,
		layout: 'vertical',
		backgroundColor: '#f2f7fa'
	})
	
	if(data.task.resultoptions && data.task.instruction) {
		var labelTask = Ti.UI.createLabel({
			text : 'Aufgabe:',
			color: '#336699',
			font : { fontSize : 18, fontWeight: 'bold', fontFamily : 'serif' },
			textAlign : 'left',
			top : top,
			left: 20,
			right: 20
		});
		top = 0;
		taskBox.add(labelTask);
	}

	if(data.task.instruction) {
		var labelInstruction = Ti.UI.createLabel({
			text : data.task.instruction,
			color: '#333',
			font : { fontSize : 20, fontFamily : 'sans' },
			textAlign : 'left',
			top : top,
			left: 20,
			right: 20
		});
	
		taskBox.add(labelInstruction);
	}

	bodyView2.add(taskBox);

	var resultCheck = db.getResults(data.task.uid);

	if(data.task.resulttype && data.task.instruction) {

	var answerBox = Ti.UI.createView({
		top: 20,
		borderWidth:1,
		borderRadius:5,
		layout: 'vertical',
	})

		switch(data.task.resulttype) {
			
			case 'username':
			case 'text':

				var labelAnswer = Ti.UI.createLabel({
					text : 'Antwort:',
					color: '#336699',
					font : { fontSize : 18, fontWeight: 'bold', fontFamily : 'serif' },
					textAlign : 'left',
					top : 0,
					left: 20,
					right: 20
				});

				top = 0;
				answerBox.add(labelAnswer);


				var textarea = Titanium.UI.createTextArea({
					value:'',
					height:150,
					font:{fontSize:20,fontFamily:'sans'},
					color:'#333',
					backgroundColor : '#ffffff',
					textAlign:'left',
					left: 20,
					right: 20,
					borderWidth:1,
					borderColor:'#bbb',
					borderRadius:5,
					suppressReturn:false
				});

				if(resultCheck.length) {
					textarea.value = resultCheck[0].result_text;
				}

				answerBox.add(textarea);

				break;

			case 'userphoto':
			case 'photo':

				var btn_cam = Titanium.UI.createButton({
					title : 'Foto aufnehmen',
					height : 40,
					width : 200,
					top: 50,
					zIndex : 100
				});

				btn_cam.addEventListener('click', function() {

					var win = Ti.UI.createWindow({
						height:Ti.Platform.displayCaps.platformHeight,
						width:Ti.Platform.displayCaps.platformWidth,
						url : 'cam.js',
						navBarHidden : true,
						zIndex : 1000
					});

					win.photoID     = data.task.uid;
					win.photoPrefix = PHOTO_PREFIX;
					win.imgBox = answerBox;
					win.open();

				});

				if(resultCheck.length) {
					if(resultCheck[0].result_photo != '') {
						var f = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, resultCheck[0].result_photo);
						if(f.exists()) {
							var imageView = Ti.UI.createImageView({
								width : 200,
								image : f,
								top: 10
							});
							answerBox.add(imageView);
						}
					}
				}

				answerBox.add(btn_cam);

				break;
		}
		bodyView2.add(answerBox);
	}

	body.add(bodyView0);
	body.add(bodyView1);

	
	// FOOTER
	var footer = Ti.UI.createView({
		height : 50,
	});

	var btn_next = Titanium.UI.createButton({
		title : 'weiter',
		height : 40,
		width : 100,
		right: 20
	});

	btn_next.addEventListener('click', function(){
		
		var release = false;

		if(data.task.resultrequired && data.task.resultoptions && data.task.instruction) {

			var resultData = {
				taskid : data.task.uid,
				result_text  : '',
				result_photo : ''
			};

			switch(data.task.resulttype) {
			
				case 'username':
				case 'text':

					if(textarea.value != '') {
						release = true;
						resultData.result_text = textarea.value;
					}
					break;

				case 'userphoto':
				case 'photo':
					// TODO: Pruefung anders vornehmen. Beim speichern des Bildes in DB schreiben, hier Datensatz holen.
					var f = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, PHOTO_PREFIX + data.task.uid + '.png');

					if(f.exists()) {
						release = true;
						resultData.result_photo = PHOTO_PREFIX + data.task.uid + '.png';
					}

					break;
			}
		} else {
			release = true;
		}

		if(release || resultCheck.length == 1) {

			if(!resultCheck.length /*&& data.task.resultrequired*/ ) {
				
				try {
					var result_date = new Date();
					resultData.result_date = result_date.getTime();
					var insert = db.createResult(resultData);
				}
				catch(err)
				{

				}
			}

			

			if(index + 1 < app.taskData.length ) {
				taskWin.close();
				openTaskWin({ index : index+1 });
			} else {
				

				var options = [];
				options.push('Daten senden');
				options.push('Nicht auswerten');

				var optionsDialogOpts = {
					options: options,
					title:'Fertig!',
					buttonNames : [ 'Abbrechen'] // Android only
				};

				var dialog = Titanium.UI.createOptionDialog(optionsDialogOpts);

				dialog.addEventListener('click',function(e)
				{
					if (!e.button) { // Android only

					switch(e.index) {
				
						case 0:
							app.sendData();
							break;

						case 1:
							app.cleanUp();
							app.btn_continue.hide();
							Titanium.UI.currentWindow.close();
							break;

					}

				}

	});

	dialog.show();

			}

		} else {
			var a = Titanium.UI.createAlertDialog({
				title:'Fehler',
				buttonNames: ['OK']
			});
			a.setMessage('Um zur nächsten Aufgabe zu gelangen, muss die Frage beantwortet werden.');
			a.show();
		}
	});

	if(index > 0) {

		var btn_prev = Titanium.UI.createButton({
			title : 'zurück',
			height : 40,
			width : 100,
			left: 20
		});

		btn_prev.addEventListener('click', function(){
			taskWin.close();
			if(index - 1 >= 0 ) {
				openTaskWin({ index : index-1 });
			}
		});

		footer.add(btn_prev);

	}

	footer.add(btn_next);

	bodyView2.add(footer);
	scrollView.add(bodyView2);
	body.add(scrollView);
	taskWin.add(body);
} 

Ti.App.addEventListener( 'loadRallye' ,   app.getRallyeList );
Ti.App.addEventListener( 'displayRallye', app.display );
Ti.App.addEventListener( 'openTaskWin',   openTaskWin);

app.init();
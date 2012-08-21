var win = Titanium.UI.currentWindow;

var _debug = function (msg) 
{
	var a = Titanium.UI.createAlertDialog({
		buttonNames: ['OK']
	});
	a.setMessage(msg);
	a.show();
} 

Titanium.Media.showCamera({

	success:function(event)
	{
		var cropRect = event.cropRect;
		var image = event.media;

		Ti.API.debug('Our type was: '+event.mediaType);
		if(event.mediaType == Ti.Media.MEDIA_TYPE_PHOTO)
		{

			var f = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, win.photoPrefix + win.photoID + '.png');
			f.write(image);
			

			var imageView = Ti.UI.createImageView({
				width : 200,
				image : f,
				top: 10
			});

			if (win.imgBox.children) {
				for (var c = win.imgBox.children.length - 1; c >= 0; c--) {
					win.imgBox.remove(win.imgBox.children[c]);
				}
			}

			win.imgBox.add(imageView);
			//_debug(win.imgBox.children.toString());
			win.close();

		}
		else
		{
			alert("got the wrong type back ="+event.mediaType);
		}
	},
	cancel:function()
	{
	},
	error:function(error)
	{
		// create alert
		var a = Titanium.UI.createAlertDialog({title:'Camera'});

		// set message
		if (error.code == Titanium.Media.NO_CAMERA)
		{
			a.setMessage('Please run this test on device');
		}
		else
		{
			a.setMessage('Unexpected error: ' + error.code);
		}

		// show alert
		a.show();
	},
	saveToPhotoGallery:false,
	allowEditing:true,
	mediaTypes:[/*Ti.Media.MEDIA_TYPE_VIDEO,*/Ti.Media.MEDIA_TYPE_PHOTO]
});
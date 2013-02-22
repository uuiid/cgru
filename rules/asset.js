ASSETS = {};
ASSET = null;

a_elThumbnails = null;
a_elFolders = null;
a_elFilter = null;
a_elCurEditStatus = null;

function a_Finish()
{
	ASSETS = {};
	ASSET = null;

	u_el.assets.innerHTML = '';
	u_el.asset.innerHTML = '';

	a_elThumbnails = null;
	a_elFolders = null;
	a_elFilter = null;
}

function a_Process()
{
	a_AutoSeek();

//	if( ASSET ) c_RulesMergeObjs( ASSET, RULES.assets[ASSET.type]);

	a_ShowHeaders();

	a_ShowBody();

	var path = cgru_PM('/'+RULES.root+g_elCurFolder.m_path);
	c_Info( path);
	u_el.open.setAttribute('cmdexec', JSON.stringify([RULES.open.replace(/@PATH@/g, path)]));
}

function a_ShowBody()
{
	u_el.asset.innerHTML = '';
	if( ASSET == null ) return;

	thumbnails = [];

	window.document.title = ASSET.name + ' ' + window.document.title;

	if( ASSET.thumbnails != null )
	{
		a_ShowThumbnails();
		return;
	}

	if( ASSET.source )
	{
		var elSource = document.createElement('div');
		u_el.asset.appendChild( elSource);
		elSource.classList.add('sequences');
		elSource.classList.add('button');
		elSource.textContent = 'Scan Sources';
		elSource.onclick = a_OpenCloseSourceOnClick;
	}

	var walk = {};
	walk.paths = [];
	if( ASSET.result )
	{
		walk.result = [];
		for( var r = 0; r < ASSET.result.path.length; r++)
		{
			walk.result.push( walk.paths.length);
			walk.paths.push( ASSET.path + '/' + ASSET.result.path[r]);
		}
	}
	if( ASSET.dailies )
	{
		walk.dailies = [];
		for( var r = 0; r < ASSET.dailies.path.length; r++)
		{
			walk.dailies.push( walk.paths.length);
			walk.paths.push( ASSET.path + '/' + ASSET.dailies.path[r]);
		}
	}

	if( walk.paths.length )
		walk.walks = n_WalkDir( walk.paths, 0);

	if( ASSET.result )
	{
		var elResult = document.createElement('div');
		u_el.asset.appendChild( elResult);
//		elResult.classList.add('sequences');

		var founded = false;
		for( var i = 0; i < walk.result.length; i++)
		{
			var folders = walk.walks[walk.result[i]].folders;
			var path = walk.paths[walk.result[i]];
			if( folders == null ) continue;
			if( folders.length )
			{
				var elPath = document.createElement('div');
				elResult.appendChild( elPath);
				elPath.textContent = ASSET.result.path[i];
			}
			else
				continue;

			if( folders.length )
			{
				thumbnails.push( path);
				u_ShowFolder( elResult, path, {"folders":folders})
				founded = true;
			}
		}

		if( false == founded )
			elResult.textContent = JSON.stringify( ASSET.result.path );
	}

	if( ASSET.dailies )
	{
		var elDailies = document.createElement('div');
		u_el.asset.appendChild( elDailies);

		var founded = false;
		for( var i = 0; i < walk.dailies.length; i++)
		{
			var path = walk.paths[walk.dailies[i]];
			var files = walk.walks[walk.dailies[i]].files;
			var folders = walk.walks[walk.dailies[i]].folders;
			if(( files && files.length ) || ( folders && folders.length ))
			{
				elPath = document.createElement('div');
				elDailies.appendChild( elPath);
				elPath.textContent = ASSET.dailies.path[i];
				u_ShowFolder( elDailies, path, walk.walks[walk.dailies[i]]);
				if( thumbnails.length == 0 )
					thumbnails.push( path);
				founded = true;
			}
		}

		if( false == founded )
			elDailies.textContent = JSON.stringify( ASSET.dailies.path );
	}


	if( thumbnails.length )
		c_MakeThumbnail( thumbnails, ASSET.path);
}

function a_Create( i_type, i_name, i_path)
{
	var asset = {};
	asset.name = i_name;
	asset.path = i_path;
	asset.type = i_type;

	c_RulesMergeObjs( asset, RULES.assets[i_type]);

	ASSETS[i_type] = asset;
	if( ASSET )
	{
		if( asset.path.length > ASSET.path.length )
			ASSET = asset;
	}
	else
		ASSET = asset;
}

function a_Append( i_path, i_rules)
{
//window.console.log('a_Append: '+ i_path);
//window.console.log( JSON.stringify( i_rules));
	for( var rules in i_rules)
	for( var attr in i_rules[rules])
	{
//window.console.log('attr='+attr);
		for( var atype in RULES.assets)
		{
			if( ASSETS[atype] ) continue;
			if( attr != atype ) continue;
			a_Create( atype, RULES[attr], i_path);
			c_Log('Asset: ' + atype + '=' + RULES[attr]);
		}
	}
}

function a_AutoSeek()
{
	var folders = g_elCurFolder.m_path.split('/');
	var path = '';
	for( var i = 0; i < folders.length; i++ )
	{
		if(( folders[i].length == 0 ) && ( i != 0 )) continue;

		var nextfolder = null;
		if( i < folders.length ) nextfolder = folders[i+1];
		if( nextfolder == '' ) continue;

		if( path == '/' )
			path += folders[i];
		else
			path += '/' + folders[i];
//window.console.log('path='+path);
		for( var asset_type in RULES.assets)
		{
			if( ASSETS[asset_type]) continue;
//window.console.log( asset_type);
			var seekpaths = RULES.assets[asset_type].seek;
			if( seekpaths == null ) continue;
			for( var l = 0; l < seekpaths.length; l++)
			{
				var subfolder = ( seekpaths[l].lastIndexOf('/') == (seekpaths[l].length-1))
//window.console.log('seekpath-'+subfolder+'='+seekpaths[l]);
				var seekpath = seekpaths[l];
				if( subfolder )
				{
					if( nextfolder == null ) break;
					seekpath = seekpaths[l].substr( 0, seekpaths[l].lastIndexOf('/'));
				}

				if( seekpath == '') seekpath = '/';

				for( var a_type in ASSETS)
					seekpath = seekpath.replace('['+a_type+']', ASSETS[a_type].path);

				var apath = path;
				var aname = folders[i];
				if( subfolder )
					aname = nextfolder;
//window.console.log('seekpath-'+subfolder+'='+seekpath);
//window.console.log('apath='+apath);

				if( apath == seekpath )
				{
					if( subfolder )
					{
						if( apath == '/' ) apath = '/' + nextfolder;
						else apath = apath + '/' + nextfolder;
					}
					a_Create( asset_type, aname, apath);
					c_Log('Asset founded: ' + asset_type + '=' + aname);
					break;
				}
			}
		}
	}
}

function a_ShowHeaders()
{
	u_el.assets.innerHTML = '';

	var assets = [];
	for( var a_type in ASSETS ) assets.push( ASSETS[a_type]);
	assets.sort(function(a,b){if(a.path.length>b.path.length)return 1;return -1;});

	for( var i = 0; i < assets.length; i++)
	{
		var asset = assets[i];
//		if( RULES.assets[a_type].showontop === false ) continue;
		var a_type = asset.type;
		var a_name = asset.name;

		elHeader = document.createElement('div');
		u_el.assets.appendChild( elHeader);
		elHeader.classList.add('asset');
		elHeader.m_path = asset.path;
		elHeader.onclick = function(e){g_GO(e.currentTarget.m_path)};

		elType = document.createElement('div');
		elHeader.appendChild( elType);
		elType.classList.add('type');
		elType.textContent = a_type + ':';

		elName = document.createElement('div');
		elHeader.appendChild( elName);
		elName.classList.add('name');
		elName.textContent = a_name;
	}
}

function a_OpenCloseSourceOnClick( i_evt)
{
	var el = i_evt.currentTarget;
	var elSource = el;

	if( elSource.m_scanned ) return;
	elSource.m_scanned = true;
	elSource.textContent = '';
	elSource.classList.remove('button');

	var founded = false;
	var paths = [];
	for( var i = 0; i < ASSET.source.path.length; i++)
		paths.push( ASSET.path + '/' + ASSET.source.path[i]);
	var walkdir = n_WalkDir( paths, 5);
	for( var i = 0; i < walkdir.length; i++)
	{
		var flist = [];
		a_SourceWalkFind( walkdir[i], flist);
		if( flist.length )
		{
			var elPath = document.createElement('div');
			elSource.appendChild( elPath);
			elPath.textContent = ASSET.source.path[i];
			for( var f = 0; f < flist.length; f++)
			{
				var fname = flist[f];
				u_ShowSequence( elSource, paths[i]+'/'+fname);
				founded = true;
			}
		}
	}
	if( false == founded )
		elSource.textContent = JSON.stringify( ASSET.source.path);
}

function a_SourceWalkFind( i_walk, o_list, i_path)
{
//window.console.log( JSON.stringify( i_walk).replace(/,/g,', '));
	if( i_walk.folders == null ) return;

	i_walk.folders.sort( c_CompareFolders );
	for( var f = 0; f < i_walk.folders.length; f++)
	{
		var fobj = i_walk.folders[f];
		var path = i_path;
		if( path ) path += '/' + fobj.name;
		else path = fobj.name;
		if( fobj.files && fobj.files.length)
			o_list.push( path);
		a_SourceWalkFind( fobj, o_list, path);
	}
}

function a_ShowThumbnails()
{
	a_elThumbnails = [];

	a_elFilter = document.createElement('div');
	u_el.asset.appendChild( a_elFilter);
	a_elFilter.style.padding = '4px';
	a_elFilter.style.position = 'relative';
	a_elFilter.classList.add('filter');

	var elLabel = document.createElement('div');
	a_elFilter.appendChild( elLabel);
	a_elFilter.m_elLabel = elLabel;
	elLabel.textContent = 'Filter Thumbnails';
	elLabel.style.textAlign = 'center';
	elLabel.style.cursor = 'pointer';
	elLabel.style.width = '50%';
	elLabel.onclick = function(e){
		var el = e.currentTarget.parentNode;
		el.m_elLabel.style.display = 'none';
		el.m_elBody.style.display='block';
	};

	var elBody = document.createElement('div');
	a_elFilter.appendChild( elBody);
	a_elFilter.m_elBody = elBody;
	elBody.style.display = 'none';
	elBody.classList.add('body');

	var elBtnsDiv = document.createElement('div');
	elBody.appendChild( elBtnsDiv);
	elBtnsDiv.style.cssFloat = 'right';

	var elBtnClose = document.createElement('div');
	elBtnsDiv.appendChild( elBtnClose);
	elBtnClose.textContent = 'Close';
	elBtnClose.style.cssFloat = 'right';
	elBtnClose.classList.add('button');
	elBtnClose.onclick = function(e){
		g_ClearLocationArgs();
		a_ShowAllThumbnails();
		a_elFilter.m_elBody.style.display = 'none';
		a_elFilter.m_elLabel.style.display = 'block';
	};

	var elBtnShowAll = document.createElement('div');
	elBtnsDiv.appendChild( elBtnShowAll);
	elBtnShowAll.textContent = 'Show All';
	elBtnShowAll.onclick = function(e){g_SetLocationArgs({"a_TFilter":null});};
	elBtnShowAll.classList.add('button');
	elBtnShowAll.style.cssFloat = 'right';

	var elBtnFilter = document.createElement('div');
	elBtnsDiv.appendChild( elBtnFilter);
	elBtnFilter.classList.add('button');
	elBtnFilter.textContent = 'Filter';
	elBtnFilter.style.cssFloat = 'right';
	elBtnFilter.onclick = a_ThumbFilterApply;

	var elPercentDiv = document.createElement('div');
	elBody.appendChild( elPercentDiv);
	elPercentDiv.style.cssFloat = 'left';
	elPercentDiv.style.textAlign = 'center';
	var elPercentLabel = document.createElement('div');
	elPercentDiv.appendChild( elPercentLabel);
	elPercentLabel.textContent = 'Percent:';
	elPercentLabel.style.cssFloat = 'left';
	var elPercentMin = document.createElement('div');
	elPercentDiv.appendChild( elPercentMin);
	elPercentMin.style.cssFloat = 'left';
	elPercentMin.contentEditable = 'true';
	elPercentMin.classList.add('editing');
	elPercentMin.style.width = '40px';
	var elPercentLabel = document.createElement('div');
	elPercentDiv.appendChild( elPercentLabel);
	elPercentLabel.textContent = '-';
	elPercentLabel.style.cssFloat = 'left';
	var elPercentMax = document.createElement('div');
	elPercentDiv.appendChild( elPercentMax);
	elPercentMax.style.cssFloat = 'left';
	elPercentMax.contentEditable = 'true';
	elPercentMax.classList.add('editing');
	elPercentMax.style.width = '40px';
	a_elFilter.m_elPercentMin = elPercentMin;
	a_elFilter.m_elPercentMax = elPercentMax;

	var elFinishDiv = document.createElement('div');
	elBody.appendChild( elFinishDiv);
	elFinishDiv.style.textAlign = 'center';
	var elFinishLabel = document.createElement('div');
	elFinishDiv.appendChild( elFinishLabel);
	elFinishLabel.textContent = 'Finish:';
	elFinishLabel.style.cssFloat = 'left';
	var elFinishMin = document.createElement('div');
	elFinishDiv.appendChild( elFinishMin);
	elFinishMin.style.cssFloat = 'left';
	elFinishMin.contentEditable = 'true';
	elFinishMin.classList.add('editing');
	elFinishMin.style.width = '40px';
	var elFinishLabel = document.createElement('div');
	elFinishDiv.appendChild( elFinishLabel);
	elFinishLabel.textContent = '-';
	elFinishLabel.style.cssFloat = 'left';
	var elFinishMax = document.createElement('div');
	elFinishDiv.appendChild( elFinishMax);
	elFinishMax.style.cssFloat = 'left';
	elFinishMax.contentEditable = 'true';
	elFinishMax.classList.add('editing');
	elFinishMax.style.width = '40px';
	a_elFilter.m_elFinishMin = elFinishMin;
	a_elFilter.m_elFinishMax = elFinishMax;

	var elStatusDiv = document.createElement('div');
	elBody.appendChild( elStatusDiv);
	var elStatusLabel = document.createElement('div');
	elStatusDiv.appendChild( elStatusLabel);
	elStatusLabel.textContent = 'Status:';
	elStatusLabel.style.cssFloat = 'left';
	var elStatus = document.createElement('div');
	elStatusDiv.appendChild( elStatus);
	elStatus.contentEditable = 'true';
	elStatus.classList.add('editing');
	a_elFilter.m_elStatus = elStatus;

	var elArtistsDiv = document.createElement('div');
	elBody.appendChild( elArtistsDiv);
	var elArtistsLabel = document.createElement('div');
	elArtistsDiv.appendChild( elArtistsLabel);
	elArtistsLabel.textContent = 'Artists:';
	elArtistsLabel.style.cssFloat = 'left';
	var elArtists = document.createElement('div');
	elArtistsDiv.appendChild( elArtists);
	elArtists.classList.add('artists');
	a_elFilter.m_elArtists = [];
	for( var user in g_users )
	{
		el = document.createElement('div');
		elArtists.appendChild( el);
		el.style.cssFloat = 'left';
		el.textContent = c_GetUserTitle( user);
		el.m_user = user;
		el.classList.add('tag');
		el.onclick = function(e){ c_ElToggleSelected(e); a_ThumbFilterApply()};
		a_elFilter.m_elArtists.push( el);
	}

	var elTagsDiv = document.createElement('div');
	elBody.appendChild( elTagsDiv);
	var elTagsLabel = document.createElement('div');
	elTagsDiv.appendChild( elTagsLabel);
	elTagsLabel.textContent = 'Tags:';
	elTagsLabel.style.cssFloat = 'left';
	var elTags = document.createElement('div');
	elTagsDiv.appendChild( elTags);
	elTags.classList.add('tags');
	a_elFilter.m_elTags = [];
	for( var i = 0; i < RULES.tags.length; i++)
	{
		el = document.createElement('div');
		elTags.appendChild( el);
		el.style.cssFloat = 'left';
		el.textContent = RULES.tags[i];
		el.m_tag = RULES.tags[i];
		el.classList.add('tag');
		el.onclick = function(e){ c_ElToggleSelected(e); a_ThumbFilterApply()};
		a_elFilter.m_elTags.push( el);
	}

	if( ASSET.thumbnails === 0 )
	{
		var folders = g_elCurFolder.m_dir.folders;
		for( var f = 0; f < folders.length; f++ )
		{
			if( folders[f].name.indexOf('.') == 0 ) continue;
			if( folders[f].name.indexOf('_') == 0 ) continue;

			var path = g_elCurFolder.m_path + '/' + folders[f].name;

			var elFolder = document.createElement('div');
			a_elThumbnails.push( elFolder);
			elFolder.m_status = folders[f].status;
			elFolder.m_path = path;
			u_el.asset.appendChild( elFolder);
			elFolder.style.padding = '4px';
			elFolder.classList.add('shot');

			var elImg = document.createElement('img');
			elFolder.appendChild( elImg);
			elImg.classList.add('thumbnail');
			elImg.m_path = path;
			elImg.onclick = function(e){g_GO(e.currentTarget.m_path)};
			elImg.src = RULES.root + path + '/' + RULES.rufolder + '/' + RULES.thumbnail.filename;

			var elName = document.createElement('div');
			elFolder.appendChild( elName);
			elName.classList.add('button');
			elName.m_path = path;
			elName.onclick = function(e){g_GO(e.currentTarget.m_path)};
			elName.textContent = folders[f].name;

			elFolder.m_elFinish = document.createElement('div');
			elFolder.appendChild( elFolder.m_elFinish);

			elFolder.m_elStatus = document.createElement('div');
			elFolder.appendChild( elFolder.m_elStatus);
			elFolder.m_elStatus.classList.add('status');

			elFolder.m_elEdit = document.createElement('div');
			elFolder.m_elStatus.appendChild( elFolder.m_elEdit);
			elFolder.m_elEdit.classList.add('button');
			elFolder.m_elEdit.classList.add('btn_edit');
			elFolder.m_elEdit.textContent = 'Edit';
			elFolder.m_elEdit.m_elFolder = elFolder;
			elFolder.m_elEdit.onclick = function(e){
				var el = e.currentTarget.m_elFolder;
				a_elCurEditStatus = el;
				st_CreateEditUI( el, el.m_path, el.m_status, a_ThumbStatusApply, el.m_elStatus);
			};

			elFolder.m_elProgress = document.createElement('div');
			elFolder.m_elStatus.appendChild( elFolder.m_elProgress);
			elFolder.m_elProgress.classList.add('progress');
			elFolder.m_elProgressBar = document.createElement('div');
			elFolder.m_elProgress.appendChild( elFolder.m_elProgressBar);
			elFolder.m_elProgressBar.classList.add('progressbar');

			elFolder.m_elPercent = document.createElement('div');
			elFolder.m_elStatus.appendChild( elFolder.m_elPercent);
			elFolder.m_elPercent.classList.add('percent');

			elFolder.m_elAnn = document.createElement('div');
			elFolder.m_elStatus.appendChild( elFolder.m_elAnn);
			elFolder.m_elAnn.classList.add('annotation');

			elFolder.m_elArtists = document.createElement('div');
			elFolder.m_elStatus.appendChild( elFolder.m_elArtists);
			elFolder.m_elArtists.classList.add('artists');

			elFolder.m_elTags = document.createElement('div');
			elFolder.m_elStatus.appendChild( elFolder.m_elTags);
			elFolder.m_elTags.classList.add('tags');

			a_elCurEditStatus = elFolder;
			a_ThumbStatusApply( folders[f].status);
			a_elCurEditStatus = null;
		}
	}

	if( ASSET.thumbnails > 0 )
	{
		a_elFolders = [];

		var walk = n_WalkDir([ASSET.path], ASSET.thumbnails, RULES.rufolder,['rules','status'],['status'])[0];
		walk.folders.sort( c_CompareFolders );

		for( var sc = 0; sc < walk.folders.length; sc++)
		{
			var fobj = walk.folders[sc];
			if( fobj.name.indexOf('.') == 0 ) continue;
			if( fobj.name.indexOf('_') == 0 ) continue;

			var elScene = document.createElement('div');
			a_elFolders.push( elScene);
			elScene.m_elThumbnails = [];
			u_el.asset.appendChild( elScene);
			elScene.classList.add('scene');
			elScene.m_path = ASSET.path + '/' + fobj.name;
//			elScene.onclick = function(e){g_GO(e.currentTarget.m_path)};

			var elName = document.createElement('a');
			elScene.appendChild( elName);
			elName.classList.add('name');
			elName.textContent = fobj.name;
			elName.href = '#'+elScene.m_path;

			var elStatus = document.createElement('div');
			elScene.appendChild( elStatus);
			elStatus.classList.add('status');
//window.console.log(JSON.stringify(fobj));
			st_SetElLabel( fobj.status, elStatus);
			st_SetElColor( fobj.status, elScene);

			walk.folders[sc].folders.sort( c_CompareFolders );
			for( var s = 0; s < walk.folders[sc].folders.length; s++)
			{
				var fobj = walk.folders[sc].folders[s];
				if( fobj.name.indexOf('.') == 0 ) continue;
				if( fobj.name.indexOf('_') == 0 ) continue;

				var elShot = document.createElement('div');
				a_elThumbnails.push( elShot);
				elShot.m_status = fobj.status;
				elScene.appendChild( elShot);
				elScene.m_elThumbnails.push( elShot);
				elShot.classList.add('shot');
				elShot.m_path = elScene.m_path + '/' + fobj.name;
//				elShot.onclick = function(e){e.stopPropagation();g_GO(e.currentTarget.m_path)};
				elShot.ondblclick = function(e){
					var el = e.currentTarget;
					a_elCurEditStatus = el;
					st_CreateEditUI( el, el.m_path, el.m_status, a_ThumbStatusApply);
					return false;
				};

				var elImg = document.createElement('img');
				elShot.appendChild( elImg);
				elImg.src = RULES.root + elShot.m_path +'/'+ RULES.rufolder +'/'+ RULES.thumbnail.filename;

				elShot.m_elStatus = document.createElement('div');
				elShot.appendChild( elShot.m_elStatus);
				elShot.m_elStatus.classList.add('status');

				elShot.m_elAnn = document.createElement('div');
				elShot.m_elStatus.appendChild( elShot.m_elAnn);
				elShot.m_elAnn.classList.add('annotation');

				elShot.m_elPercent = document.createElement('div');
				elShot.m_elStatus.appendChild( elShot.m_elPercent);
				elShot.m_elPercent.classList.add('percent');

//				var elName = document.createElement('div');
				var elName = document.createElement('a');
				elShot.m_elStatus.appendChild( elName);
				elName.classList.add('name');
				elName.textContent = fobj.name;
				elName.href = '#'+elShot.m_path;

				elShot.m_elProgress = document.createElement('div');
				elShot.m_elStatus.appendChild( elShot.m_elProgress);
				elShot.m_elProgress.classList.add('progress');
				elShot.m_elProgressBar = document.createElement('div');
				elShot.m_elProgress.appendChild( elShot.m_elProgressBar);
				elShot.m_elProgressBar.classList.add('progressbar');

				elShot.m_elTags = document.createElement('div');
				elShot.m_elStatus.appendChild( elShot.m_elTags);
				elShot.m_elTags.classList.add('tags');

				elShot.m_elArtists = document.createElement('div');
				elShot.m_elStatus.appendChild( elShot.m_elArtists);
				elShot.m_elArtists.classList.add('artists');

				elShot.m_elFinish = document.createElement('div');
				elShot.m_elStatus.appendChild( elShot.m_elFinish);
				elShot.m_elFinish.classList.add('finish');

				a_elCurEditStatus = elShot;
				a_ThumbStatusApply( fobj.status);
				a_elCurEditStatus = null;
			}
		}
	}
}

function a_ThumbStatusApply( i_status)
{
	if( i_status != null ) a_elCurEditStatus.m_status = c_CloneObj( i_status);
	st_SetElLabel( i_status, a_elCurEditStatus.m_elAnn, false);
	st_SetElArtists( i_status, a_elCurEditStatus.m_elArtists);
	st_SetElTags( i_status, a_elCurEditStatus.m_elTags);
	st_SetElProgress( i_status, a_elCurEditStatus.m_elProgressBar, a_elCurEditStatus.m_elProgress, a_elCurEditStatus.m_elPercent);
	st_SetElFinish( i_status, a_elCurEditStatus.m_elFinish, ASSET.thumbnails === 0 );
	st_SetElColor( i_status, a_elCurEditStatus);
}

function a_ThumbFilterApply()
{
	var args = {};
	if( a_elFilter.m_elStatus.textContent.length )
		args.ann = a_elFilter.m_elStatus.textContent;

	for( var i = 0; i < a_elFilter.m_elArtists.length; i++)
		if( a_elFilter.m_elArtists[i].m_selected )
		{
			if( args.artists == null ) args.artists = [];
			args.artists.push( a_elFilter.m_elArtists[i].m_user);
		}

	for( var i = 0; i < a_elFilter.m_elTags.length; i++)
		if( a_elFilter.m_elTags[i].m_selected )
		{
			if( args.tags == null ) args.tags = [];
			args.tags.push( a_elFilter.m_elTags[i].m_tag);
		}

	var permin = c_GetElInteger( a_elFilter.m_elPercentMin);
	var permax = c_GetElInteger( a_elFilter.m_elPercentMax);
	if(( permin != null ) || ( permax != null ))
		args.percent = [permin,permax];

	var finmin = c_GetElInteger( a_elFilter.m_elFinishMin);
	var finmax = c_GetElInteger( a_elFilter.m_elFinishMax);
	if(( finmin != null ) || ( finmax != null ))
		args.finish = [finmin,finmax];

	g_SetLocationArgs({"a_TFilter":args});
}
function a_TFilter( i_args)
{
//c_Info( JSON.stringify(i_args));
	if( a_elFilter )
	{
		a_elFilter.m_elLabel.style.display = 'none';
		a_elFilter.m_elBody.style.display = 'block';
	}
	else
	{
		c_Error('Can`t find filter element.');
		return;
	}

	if( a_elThumbnails == null )
	{
		c_Error('Asset does not have any thumbnails.');
		return;
	}

	if( i_args == null ) i_args = {};

	var anns = null;
	if( i_args.ann )
	{
		a_elFilter.m_elStatus.textContent = i_args.ann;
		var anns_or = i_args.ann.split(',');
		anns = [];
		for( var o = 0; o < anns_or.length; o++)
			anns.push( anns_or[o].split(' '));
	}
	if( i_args.artists )
	{
		for( i = 0; i < a_elFilter.m_elArtists.length; i++ )
			c_ElSetSelected( a_elFilter.m_elArtists[i], i_args.artists.indexOf( a_elFilter.m_elArtists[i].m_user ) != -1 )
	}
	if( i_args.tags ) 
	{
		for( i = 0; i < a_elFilter.m_elTags.length; i++ )
			c_ElSetSelected( a_elFilter.m_elTags[i], i_args.tags.indexOf( a_elFilter.m_elTags[i].m_tag ) != -1 )
	}
	if( i_args.percent )
	{
		if(( i_args.percent[0] != null ) && ( i_args.percent[1] != null ) && ( i_args.percent[0] > i_args.percent[1] ))
		{
			i_args.percent[0]+= i_args.percent[1];
			i_args.percent[1] = i_args.percent[0] - i_args.percent[1];
			i_args.percent[0] = i_args.percent[0] - i_args.percent[1];
		}
		a_elFilter.m_elPercentMin.textContent = i_args.percent[0];
		a_elFilter.m_elPercentMax.textContent = i_args.percent[1];
	}
	if( i_args.finish )
	{
		if(( i_args.finish[0] != null ) && ( i_args.finish[1] != null ) && ( i_args.finish[0] > i_args.finish[1] ))
		{
			i_args.finish[0]+= i_args.finish[1];
			i_args.finish[1] = i_args.finish[0] - i_args.finish[1];
			i_args.finish[0] = i_args.finish[0] - i_args.finish[1];
		}
		a_elFilter.m_elFinishMin.textContent = i_args.finish[0];
		a_elFilter.m_elFinishMax.textContent = i_args.finish[1];
	}

	for( var th = 0; th < a_elThumbnails.length; th++)
	{
		var el = a_elThumbnails[th];
		var founded = ( i_args == null );

		if( el.m_status == null ) el.m_status = {};

		if( anns )
		{
			if( el.m_status.annotation )
				for( var o = 0; o < anns.length; o++)
				{
					var founded_and = true;
					for( var a = 0; a < anns[o].length; a++)
					{
						if( el.m_status.annotation.indexOf( anns[o][a]) == -1 )
						{
							founded_and = false;
							break;
						}
					}
					if( founded_and )
					{
						founded = true;
						break;
					}
				}
		}
		else founded = true;

		if( i_args.tags && founded )
		{
			founded = false;
			if( el.m_status.tags )
				for( i = 0; i < i_args.tags.length; i++ )
					if( el.m_status.tags.indexOf( i_args.tags[i]) != -1 )
						{ founded = true; break; }
		}

		if( i_args.artists && founded )
		{
			founded = false;
			if( el.m_status.artists )
				for( i = 0; i < i_args.artists.length; i++ )
					if( el.m_status.artists.indexOf( i_args.artists[i]) != -1 )
						{ founded = true; break; }
		}

		if( i_args.percent && founded )
		{
			founded = false;
			if( el.m_status.progress &&
				(( i_args.percent[0] == null ) || ( el.m_status.progress >= i_args.percent[0] )) &&
				(( i_args.percent[1] == null ) || ( el.m_status.progress <= i_args.percent[1] )))
				founded = true;
		}

		if( i_args.finish && founded )
		{
			founded = false;
			if( el.m_status.finish )
			{
				var days = c_DT_DaysLeft( el.m_status.finish);
				if( (( i_args.finish[0] == null ) ||  days >= i_args.finish[0] ) &&
					(( i_args.finish[1] == null ) ||  days <= i_args.finish[1] ))
					founded = true;
			}
		}

		if( founded )
		{
			el.style.display = 'block';
			el.m_hidden = false;
		}
		else
		{
			el.style.display = 'none';
			el.m_hidden = true;
		}
	}

	if( a_elFolders )
		for( var f = 0; f < a_elFolders.length; f++)
		{
			var oneShown = false;
			for( var t = 0; t < a_elFolders[f].m_elThumbnails.length; t++)
			{
				if( a_elFolders[f].m_elThumbnails[t].m_hidden != true )
				{
					oneShown = true;
					break;
				}
			}
			if( oneShown )
				a_elFolders[f].style.display = 'block';
			else
				a_elFolders[f].style.display = 'none';
		}
}

function a_ShowAllThumbnails()
{
	for( var i = 0; i < a_elThumbnails.length; i++)
		a_elThumbnails[i].style.display = 'block';

	if( a_elFolders )
		for( var i = 0; i < a_elFolders.length; i++)
			a_elFolders[i].style.display = 'block';
}


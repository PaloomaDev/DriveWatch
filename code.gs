let listFoldersAndFiles = []

/*******************************************************************************************************
* This function watch the folders and send the notifications
* ******************************************************************************************************
* @param {} 
* @return {} 
*/
function watchFolders() {
  //Défine the frequency value
  let frequency = 1
  switch (PropertiesService.getUserProperties().getProperty('frequency')) {
    case "month_frequency":
      frequency = 31
      break
    case "twoWeek_frequency":
      frequency = 14
      break
    case "week_frequency":
      frequency = 7
      break
    case "day_frequency":
      frequency = 1
      break
  }
  Logger.log(frequency)
  //Défine the date from which we will filter by creation date the folders and files 
  let previousWatchDate = new Date().getTime() - frequency * 24 * 60 * 60 * 1000
  //list all folders watched  
  getFilesAndFolders()
  Logger.log(listFoldersAndFiles)

  //Filter with the threshold date
  let newFilesFolders = listFoldersAndFiles.filter(x => new Date(x[3]) > new Date(previousWatchDate))
  Logger.log(newFilesFolders)
  //Remove the duplicate line by the folder name. This will avoid to send several notification for one folder watched
  //since we are sending one notification by folder watched
  let foldersWatched = newFilesFolders.filter(function (a) {
    var key = a.slice(0, 1).sort().join('|');
    return !this[key] && (this[key] = true);
  }, Object.create(null));


  //Loop over the unique folders watched
  foldersWatched.forEach(function (f) {

    let htmlTable = ""
    let listButtons = []
    //Filter on all the new folders and files related to the current folder
    newFilesFolders.filter(x => x[0] == f[0]).forEach(function (t) {
      //Create the mail notification content
      htmlTable += '<tr><td style="width: 60%; text-align: center;"><a title="' + t[1]
        + '" href="' + t[2] + '" target="_blank">' + t[1] + '</a></td> <td style="width: 40%; text-align: center;">'
        + Utilities.formatDate(t[3], Session.getScriptTimeZone(), "dd/MM/YYYY hh:mm") + '</td></tr>'
      //Create the chat notification content 
      listButtons.push({
        "text": t[1],
        "onClick": {
          "openLink": {
            "url": t[2]
          }
        }
      })
    })

    //mail sending
    let tmp = HtmlService.createTemplateFromFile('mail')
    tmp.table = '<tr><td style="width: 60%; text-align: center;"><a title="' + "t[1]"
        + '" href="' + t[2] + '" target="_blank">' + t[1] + '</a></td> <td style="width: 40%; text-align: center;">'
        + Utilities.formatDate(t[3], Session.getScriptTimeZone(), "dd/MM/YYYY hh:mm") + '</td></tr>'
    try {
      MailApp.sendEmail(Session.getActiveUser().getEmail() + "," + f[5], "[" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/YYYY") + "] Drive Watch Addon : new activity in " + f[0], "", { htmlBody: tmp.evaluate().getContent() })
    }
    catch (e) {
      //In case of wrong emails set up 
      MailApp.sendEmail(Session.getActiveUser().getEmail(), "[" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/YYYY") + "] Drive Watch Addon : new activity in " + f[0], "Be careful, wrong emails have been registered for notifications", { htmlBody: tmp.evaluate().getContent() })
    }
    //chat sending
    try {
      sendChatNotification(listButtons, f[0], f[4])
    }
    catch (e) {
      //In case of wrong webhooks set up 
      MailApp.sendEmail(Session.getActiveUser().getEmail(), "[" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/YYYY") + "] Drive Watch Addon : new activity in " + f[0], "Be careful, wrong chat webhooks have been registered for notifications", { htmlBody: tmp.evaluate().getContent() })
    }
  })
}


/*******************************************************************************************************
* This function set the folders watching parameters
* ******************************************************************************************************
* @param {json} e: event information 
* @return {card} the card to display with the new settings
*/
function setWatchingParameterToFolder(e) {
  //Check if the folder id is not already in the user properties. 
  //If it's the case then remove the folderId from the properties
  //If not add all properties selected by user
  switch (e.parameters.state) {
    case "Unwatch this folder":
      deleteAllPropertiesForFolder(e.parameters.id)
      break;
    case "Watch this folder":
    case "Save settings":
      addAllPropertiesForFolder(e.parameters.id, e.commonEventObject.formInputs)
      break;
    default:
      deleteAllPropertiesForFolder(e.parameters.id)
  }
  //return the card when the folder is selected
  return CardService.newUniversalActionResponseBuilder().displayAddOnCards([onDriveItemsSelected(e)]).build()
}


/*******************************************************************************************************
* This function give the text according to the folder status : watched or not watched
* ******************************************************************************************************
* @param {string} id: folder id
* @return {string} text to add in the card button
*/
function checkIfFolderIsWatched(id) {
  let propertiesUser = []
  for (var i in PropertiesService.getUserProperties().getProperties()) {
    propertiesUser.push([i, PropertiesService.getUserProperties().getProperties()[i]])
  }
  //If the folider id is in user properties --> unwatch this folder 
  let text = propertiesUser.filter(x => x[1] == id).length > 0 ? 'Unwatch this folder' : 'Watch this folder'
  return text
}


/*******************************************************************************************************
* This function delete all properties related to the folder
* ******************************************************************************************************
* @param {string} id: folder id
* @return {} 
*/
function deleteAllPropertiesForFolder(id) {
  PropertiesService.getUserProperties().getKeys().filter(x => x.indexOf(id) > -1).forEach(function (k) {
    PropertiesService.getUserProperties().deleteProperty(k)
  })
}


/*******************************************************************************************************
* Those functions get emails notification setting for a folder
* ******************************************************************************************************
* @param {string} id: folder id
* @return {string} property 
*/
function getListEmailForNotificationOption(id) {
  return PropertiesService.getUserProperties().getProperty('listEmailForNotification_' + id) == null ? "" : PropertiesService.getUserProperties().getProperty('listEmailForNotification_' + id)
}

/*******************************************************************************************************
* Those functions get watch subfolder setting for a folder
* ******************************************************************************************************
* @param {string} id: folder id
* @return {string} property 
*/
function getWatchingSubFolderOption(id) {
  return PropertiesService.getUserProperties().getProperty('watchingSubFolder_' + id) == "watchingSubFolderOn" ? true : false
}

/*******************************************************************************************************
* Those functions get webhooks notification setting for a folder
* ******************************************************************************************************
* @param {string} id: folder id
* @return {string} property 
*/
function getListWebHooksForNotificationOption(id) {
  return PropertiesService.getUserProperties().getProperty('listWebHookForNotification_' + id) == null ? "" : PropertiesService.getUserProperties().getProperty('listWebHookForNotification_' + id)
}

/*******************************************************************************************************
* This function set up the properties for a folder from the card inputs
* ******************************************************************************************************
* @param {string} id: folder id
* @param {json} formInputs: the card informations
* @return {} 
*/
function addAllPropertiesForFolder(id, formInputs) {
  Logger.log(formInputs)
  let listWebHookForNotification = formInputs != null && formInputs.listWebHookForNotification != null ? formInputs.listWebHookForNotification.stringInputs.value[0] : "-"
  let listEmailForNotification = formInputs != null && formInputs.listEmailForNotification != null ? formInputs.listEmailForNotification.stringInputs.value[0] : "-"
  let watchingSubFolder = formInputs != null && formInputs.watchingSubFolder != null ? formInputs.watchingSubFolder.stringInputs.value[0] : "-"
  let folderId = id
  PropertiesService.getUserProperties().setProperty("folderId_" + id, folderId)
  PropertiesService.getUserProperties().setProperty("listWebHookForNotification_" + id, listWebHookForNotification)
  PropertiesService.getUserProperties().setProperty("listEmailForNotification_" + id, listEmailForNotification)
  PropertiesService.getUserProperties().setProperty("watchingSubFolder_" + id, watchingSubFolder)
}

/*******************************************************************************************************
* This function gets all the files/folders main informations in the array 
* ******************************************************************************************************
* @param {} 
* @return {} 
*/
function getFilesAndFolders() {
  PropertiesService.getUserProperties().getKeys().filter(x => x.indexOf("folderId_") > -1).forEach(function (t) {
    let folderId = PropertiesService.getUserProperties().getProperty(t)
    try {
      let folderName = DriveApp.getFolderById(folderId).getName()
      let listWebHookForNotification = getListWebHooksForNotificationOption(folderId)
      let listEmailForNotification = getListEmailForNotificationOption(folderId)
      let baseFolders = DriveApp.getFolderById(folderId).getFolders()
      listAllFolders(baseFolders, folderName, listWebHookForNotification, listEmailForNotification)
      if (getWatchingSubFolderOption(folderId)) {
        listAllFoldersRecursive(baseFolders, folderName, listWebHookForNotification, listEmailForNotification)
      }
      let baseFiles = DriveApp.getFolderById(folderId).getFiles()
      listAllFiles(baseFiles, folderName, listWebHookForNotification, listEmailForNotification)
    }
    catch (e) {
      Logger.log(e)
    }

  })
}


/*******************************************************************************************************
* This function add the file informations in a array from a list of files
* ******************************************************************************************************
*/
function listAllFiles(files, folderParentName, listWebHookForNotification, listEmailForNotification) {
  while (files.hasNext()) {
    let file = files.next()
    listFoldersAndFiles.push([folderParentName, file.getName(), file.getUrl(), file.getDateCreated(), listWebHookForNotification, listEmailForNotification])
  }
}




/*******************************************************************************************************
* This function add the file informations in a array from a list of files
* ******************************************************************************************************
*/
function listAllFolders(folders, folderParentName, listWebHookForNotification, listEmailForNotification) {
  while (folders.hasNext()) {
    let folder = folders.next()
    listFoldersAndFiles.push([folderParentName, folder.getName(), folder.getUrl(), folder.getDateCreated(), listWebHookForNotification, listEmailForNotification])
  }
}



/*******************************************************************************************************
* This function add the file/folders informations in a array from a list of files/folders and do it in a recursive way
* ******************************************************************************************************
*/
function listAllFoldersRecursive(folders, folderParentName, listWebHookForNotification, listEmailForNotification) {
  while (folders.hasNext()) {
    let f = folders.next();
    listFoldersAndFiles.push([folderParentName, f.getName(), f.getUrl(), f.getDateCreated(), listWebHookForNotification, listEmailForNotification])
    let files = f.getFiles();
    listAllFiles(files, folderParentName, listWebHookForNotification, listEmailForNotification);
    let subFolders = f.getFolders();
    listAllFoldersRecursive(subFolders, folderParentName, listWebHookForNotification, listEmailForNotification);
  }
}






/*******************************************************************************************************
* This function create the trigger to run the main function that probes the folder
* ******************************************************************************************************
* @param {json} e: the card input 
* @return {} 
*/
function setNotificationFrequency(e) {
  //Delete all trigger for the user
  PropertiesService.getUserProperties().setProperty("frequency", e.formInput.frequency)
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t)
  })
  //Set up a new trigger depending on the use choice 
  let frequency = PropertiesService.getUserProperties().getProperty("frequency") != null ? PropertiesService.getUserProperties().getProperty("frequency") : "day_frequency"
  switch (frequency) {
    case "month_frequency":
      ScriptApp.newTrigger("watchFolders").timeBased().onMonthDay(1).create()
      break
    case "twoWeek_frequency":
      ScriptApp.newTrigger("watchFolders").timeBased().onMonthDay(14).create()
      ScriptApp.newTrigger("watchFolders").timeBased().onMonthDay(1).create()
      break
    case "week_frequency":
      ScriptApp.newTrigger("watchFolders").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).create()
      break
    case "day_frequency":
      ScriptApp.newTrigger("watchFolders").timeBased().everyDays(1).create()
      break
    default:
      Logger.log("No frequency choosen");
  }
}



/*******************************************************************************************************
* This function sends the notification inside a chat space
* ******************************************************************************************************
* @param {json} listButtons: list of button that are the list of files and folders 
* @param {string} folderName: the folder watched name 
* @param {[string]} webhooks: list of webhook where to send the notification
* @return {} 
*/
function sendChatNotification(listButtons, folderName, webhooks) {
  let card = {
    "cards_v2": [{
      "card_id": "addContact",
      "card": {
        "header": {
          "title": "DriveWatch",
          "subtitle": "New activity in folder : " + folderName,
          "imageUrl": "https://cdn-icons-png.flaticon.com/512/330/330700.png",
          "imageType": "CIRCLE"
        },
        "sections": [
          {
            "widgets": [

              {
                "buttonList": {
                  "buttons": listButtons
                },
                "horizontalAlignment": "CENTER"
              }
            ]
          }
        ]
      }
    }]
  };
  payload = JSON.stringify(card);
  let options = {
    method: 'POST',
    contentType: 'application/json',
    payload: payload
  };
  webhooks.split(',').forEach(function (w) {
    try {
      UrlFetchApp.fetch(w, options).getContentText()
    }
    catch (e) {
      Logger.log(e)
    }
  })
}






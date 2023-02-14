

/**
 * Build a simple card that checks selected items' quota usage. Checking
 * quota usage requires user-permissions, so this add-on provides a button
 * to request `drive.file` scope for items the add-on doesn't yet have
 * permission to access.
 *
 * @param e The event object passed containing contexual information about
 *    the Drive items selected.
 * @return {Card}
 */
function onDriveItemsSelected(e) {
  Logger.log("onDriveItemsSelected")
  var builder = CardService.newCardBuilder();
  Logger.log(e)
  // For each item the user has selected in Drive, display either its
  // quota information or a button that allows the user to provide
  // permission to access that file to retrieve its quota details.
  //filter on mimeType=application/vnd.google-apps.folder
  e['drive']['selectedItems'].filter(x => x.mimeType == "application/vnd.google-apps.folder").forEach(
    function (item) {
      var cardSection = CardService.newCardSection()
        .setHeader(item['title']);
      // This add-on uses the recommended, limited-permission `drive.file`
      // scope to get granular per-file access permissions.
      // See: https://developers.google.com/drive/api/v2/about-auth
      if (item['addonHasFileScopePermission']) {
        // If the add-on has access permission, 
        //action to add the item id in the user properties
        let textButton = checkIfFolderIsWatched(item['id'])
        //add item button
        if (textButton != "Watch this folder") {
          let addFolderToWatch = CardService.newAction()
            .setFunctionName("setWatchingParameterToFolder")
            .setParameters({
              id: item['id'],
              state: textButton
            })
            .setLoadIndicator(CardService.LoadIndicator.SPINNER);

          let addFolderToWatchButton = CardService.newTextButton()
            .setText('<b><font color="#143D59">' + textButton + '</font><b>')
            .setOnClickAction(addFolderToWatch)
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setBackgroundColor("#f4B41A")
          cardSection.addWidget(addFolderToWatchButton)
        }
        // Action to open the folders settings 
        let goToSettings = CardService.newAction()
          .setFunctionName('createSettingsFolder').setParameters({ id: item['id'], name: item['title'] });

        //button to open the calendar managment card 
        let settingsButton = CardService.newTextButton()
          .setText('<b><font color="#143D59">Go to settings</font><b>')
          .setOnClickAction(goToSettings)
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setBackgroundColor("#f4B41A")
        cardSection.addWidget(settingsButton)




      } else {
        // If the add-on does not have access permission, add a button
        // that allows the user to provide that permission on a per-file
        // basis.
        cardSection.addWidget(
          CardService.newTextParagraph().setText(
            "The add-on needs permission to access this file's quota."));

        var buttonAction = CardService.newAction()
          .setFunctionName("onRequestFileScopeButtonClicked")
          .setParameters({ id: item.id });

        var button = CardService.newTextButton()
          .setText("Request permission")
          .setOnClickAction(buttonAction);

        cardSection.addWidget(button);
      }
      builder.addSection(cardSection);
    });

  return builder.build();
}

/**
 * Callback function for a button action. Instructs Drive to display a
 * permissions dialog to the user, requesting `drive.file` scope for a
 * specific item on behalf of this add-on.
 *
 * @param {Object} e The parameters object that contains the item's
 *   Drive ID.
 * @return {DriveItemsSelectedActionResponse}
 */
function onRequestFileScopeButtonClicked(e) {
  var idToRequest = e.parameters.id;
  setWatchingParameterToFolder(e)
  return CardService.newDriveItemsSelectedActionResponseBuilder()
    .requestFileScope(idToRequest).build();
}


/**
* Builds the settings card depending on the folder selected  .
*
*/
function createSettingsFolder(e) {
  let header = CardService.newCardHeader().setImageUrl("https://cdn-icons-png.flaticon.com/512/330/330700.png").setTitle("Settings for watching : " + e.parameters.name)
  let listEmailForNotification = CardService.newTextInput()
    .setFieldName("listEmailForNotification").setHint("By default, only your email is notified")
    .setTitle("Email addresses separated by a comma").setMultiline(true)
    .setValue(getListEmailForNotificationOption(e.parameters.id))

  let watchSubFoldersOption = CardService.newDecoratedText()
    .setText("Watch the subfolders or only the root folder selected")
    .setWrapText(true)
    .setSwitchControl(CardService.newSwitch()
      .setFieldName("watchingSubFolder")
      .setValue("watchingSubFolderOn")
      .setSelected(getWatchingSubFolderOption(e.parameters.id))
    )

  let listWebHooksForNotification = CardService.newTextInput()
    .setFieldName("listWebHookForNotification")
    .setTitle("Chat WebHooks separated by a comma").setMultiline(true)
    .setValue(getListWebHooksForNotificationOption(e.parameters.id))


  //Return 'Watch this folder' if the folder is not in user properties already
  let textButton = checkIfFolderIsWatched(e.parameters.id)

  //add item button
  if (textButton == "Unwatch this folder") {
    textButton = "Save settings"
  }

  //Action to watch folder
  let addFolderToWatch = CardService.newAction()
    .setFunctionName("setWatchingParameterToFolder")
    .setParameters({
      id: e.parameters.id,
      state: textButton
    })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  //Button to watch folder
  let addFolderToWatchButton = CardService.newTextButton()
    .setText('<b><font color="#143D59">' + textButton + '</font><b>')
    .setOnClickAction(addFolderToWatch)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setBackgroundColor("#f4B41A")

  //Section creation
  let section1 = CardService.newCardSection().addWidget(listEmailForNotification).setCollapsible(false).setHeader('<b><font color="#143D59">Emails to notify</font><b>')
  let section2 = CardService.newCardSection().addWidget(watchSubFoldersOption).setCollapsible(false).setHeader('<b><font color="#143D59">Watch subfolders ?</font><b>')
  let section3 = CardService.newCardSection().addWidget(listWebHooksForNotification).setCollapsible(false).setHeader('<b><font color="#143D59">Chat webhooks</font><b>')
  let section4 = CardService.newCardSection().addWidget(addFolderToWatchButton).setCollapsible(false)

  return CardService.newCardBuilder().setHeader(header)
    .addSection(section1)
    .addSection(section2)
    .addSection(section3)
    .addSection(section4)
    .build();
}



/**
* Builds the addon home page card
*
*/
function createHomePage() {
  //create the frequency json object
  let frequencies = {
    month_frequency: false,
    twoWeek_frequency: false,
    week_frequency: false,
    day_frequency: false,
    default_frequency: true
  }
  //if the frequency is not defined yet by the user, the default choice will be shown
  //If not the default choice, will not be shown
  if (PropertiesService.getUserProperties().getProperty("frequency") != null) {
    frequencies[PropertiesService.getUserProperties().getProperty("frequency")] = true
    frequencies.default_frequency = false
  }
  //frequency widget
  let frequency = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("frequency")
    .addItem("Choose a frequency", "default", frequencies.default_frequency)
    .addItem("Once a month", "month_frequency", frequencies.month_frequency)
    .addItem("Once every 2 weeks", "twoWeek_frequency", frequencies.twoWeek_frequency)
    .addItem("Once a week", "week_frequency", frequencies.week_frequency)
    .addItem("Once a day", "day_frequency", frequencies.day_frequency)
    .setOnChangeAction(CardService.newAction().setFunctionName('setNotificationFrequency'));


  //Card with informations
  let informations1 = CardService.newDecoratedText()
    .setText("🗂️ This addons allows you to receive by email the new files/folders created list for any folder you want to watch")
    .setWrapText(true)
  let informations2 = CardService.newDecoratedText()
    .setText("1️⃣ Select one or more folder to watch\n2️⃣ Activate the watch on the selected folders")
    .setWrapText(true)

  //Section creation
  let section1 = CardService.newCardSection().setHeader('<b><font color="#143D59">What DriveWatch do ?</font><b>').addWidget(informations1).setCollapsible(false)
  let section2 = CardService.newCardSection().setHeader('<b><font color="#143D59">How DriveWatch works ?</font><b>').addWidget(informations2).setCollapsible(false)
  let section3 = CardService.newCardSection().setHeader('<b><font color="#143D59">Notifications frequency</font><b>').addWidget(frequency).setCollapsible(false)
  let section4 = CardService.newCardSection().setHeader('<b><font color="#143D59">Folders watched</font><b>').setCollapsible(true)
  let sectionBonus = CardService.newCardSection().setHeader('<b><font color="#143D59">Send notifications</font><b>').addWidget(
    CardService.newTextButton()
      .setText('<b><font color="#143D59">Send notifications</font><b>')
      .setOnClickAction(CardService.newAction()
        .setFunctionName("watchFolders")
        .setLoadIndicator(CardService.LoadIndicator.SPINNER))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor("#f4B41A")).setCollapsible(true)
  let header = CardService.newCardHeader().setImageUrl("https://cdn-icons-png.flaticon.com/512/330/330700.png").setTitle("Drive Watch")

  //list of folders watched 
  let ids = []
  PropertiesService.getUserProperties().getKeys().filter(x => x.indexOf("folderId") > -1).forEach(function (i) {
    ids.push(i.replace("folderId_", ""))
  })


  //If no folder watched, by default the widget will display no folder watched
  if (ids.length == 0) {
    section4.addWidget(CardService.newDecoratedText()
      .setText("No folders watched yet")
      .setWrapText(true)
    )
  }
  //Remove duplicate ids
  ids = [...new Set(ids)]
  ids.forEach(function (w) {
    try {
      let btnFolder = CardService.newTextButton()
        .setText('<b><font color="#143D59">' + DriveApp.getFolderById(w).getName() + '</font><b>')
        .setOpenLink(CardService.newOpenLink()
          .setUrl("https://drive.google.com/drive/u/0/folders/" + w)
          .setOpenAs(CardService.OpenAs.FULL_SIZE)
          .setOnClose(CardService.OnClose.RELOAD)
        )
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor("#f4B41A")
      section4.addWidget(btnFolder)
    }
    catch (e) {
      Logger.log(e)
    }
  })

  //Card builder
  return CardService.newCardBuilder().setHeader(header)
    .addSection(section1)
    .addSection(section2)
    .addSection(section3)
    .addSection(section4)
    //.addSection(sectionBonus)
    .build();
}



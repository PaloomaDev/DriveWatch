# The problem
Let's say you want to follow an important project and review the new documents added in order to stay organized.

You could check out the entire project share drive or folder and list every new input... But that's time consuming and not efficient 
So what could be another option ?

Well, we thought receiving an email notification with the new inputs list could be the solution to this problem. And to implement this solution what else than a Google Drive Addon !

# Constraints 
To solve our problem, we will need to analyze the user's drive. To do so without having the user getting a copy of a script, an Google Drive add-on would be the solution

Therefore the script will be deployed as a Google workspace addon with a dedicated GCP project.
Since it's a drive addon we will need a specific requirement to inspect folders from the user.
After that we also want the ability to define : 
 - The notification frequency  ->  for user experience issues we will send only one notification for all the folders watched . This involves one frequency setting for the addon and not for every watched folder 
  - The notification receivers depending on the folder watched 
  - The ability to watch the entire folder depth with all subfiles and subfolders 

# Architecture solution
First of all, we need to get the list of new items created from the last time we checked. In order to do so we need a time based trigger. 
This trigger will have a frequency (let’s say every 7 days). So we will use this duration to filter every item created between now and the last time the trigger ran. 
Which means every item created during the last 7 days will be in the list sent to the user. 

Then for every folder we can decide : 
  - to whom we will send the notification (email and chat)
  - if we watch or not watch or not the entire folder depth with all subfiles and subfolders 

Those options will be kept in [user properties](https://developers.google.com/apps-script/reference/properties)
/Images/architecture.png

In terms of user experience, the addon will have 3 cards :
  - The home page where you can find the the one when the user open the addon with explanations, frequency setting and folders watched list 
  - The folder page where the user can select if the folder is watched and can access the folder settings
  - The folder page settings where the user define the receivers (chat web hook , emails) and if the subfolder are watched or just the root
    - The settings for each folder are : 
      - email and chat webhooks to send notifications
      - The option to watch or not the entire folder depth with all subfiles and subfolders 

/Images/UX.png

Here is a little demo 
/Images/Demo.mov

 
# Code
The code is divided into 4 file:
* Addon.gs contains all the functions to :
  - Display cards (home page, settings)
  - Manage card events (access requests, settings creation)

* Code.gs contains all the functions to :
  - Manage and check Drive data 
  - Set user properties
  - Send notifications by mail and chat webhooks

* mail.html contains the mail structure in HTML

* appsscript.json contains the addon properties such as : 
  - openLinkUrlPrefixes & urlFetchWhitelist to list the chat webhook url 
  - oauthScopes to define for the addon to run 
  - Drive functions to run depending on the trigger (onHomepage & onSelectedItem)


# What’s next ? 

Apart from the UX that could still be improved, we thought of 3 mains improvements that could be done : 

  1. Watching directly from Shared Drive Root : unf	ortunately, it seems the addon cannot access directly from the root shared drive event after the access request. So a technical solution could be created

  2. For receivers, unsubscribe buttons for notification : if an user decides to add all her/his colleague in the notifications, those collaborators should have the ability to unsubscribe to those notifications with an integrated button/link in the email

  3. Add edited document from the last check : in the notification, we list the new documents. We could add the option to also list the edited document

The code could be improved with you, that's why it's open source !
Fare the well, fellow Apps Scripters







fx_version 'cerulean'
game 'gta5'

author 'EnhancedFX'
description 'Advanced, standalone, ACE-secured in-game administration menu'
version '2.1.0'

shared_script 'config.lua'
client_script 'client/main.lua'
server_script 'server/main.lua'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js'
}

dependency '/onesync'


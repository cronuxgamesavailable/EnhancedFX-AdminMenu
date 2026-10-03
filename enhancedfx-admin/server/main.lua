local RESOURCE = GetCurrentResourceName()
local Config = EnhancedFXAdmin
local bans = {}
local audit = {}
local reports = {}
local joins = {}
local frozen = {}
local cuffed = {}
local rateLimits = {}
local reportSequence = 0
local settings = {}
local density = {}

math.randomseed(os.time())

local function decodeFile(path, fallback)
    local raw = LoadResourceFile(RESOURCE, path)
    if not raw or raw == '' then return fallback end
    local ok, value = pcall(json.decode, raw)
    return ok and type(value) == 'table' and value or fallback
end

local function saveFile(path, value)
    SaveResourceFile(RESOURCE, path, json.encode(value), -1)
end

local function trim(value, maximum)
    local text = tostring(value or ''):gsub('[\r\n\0]', ' '):gsub('^%s+', ''):gsub('%s+$', '')
    if #text > maximum then text = text:sub(1, maximum) end
    return text
end

local function hasPermission(source, key)
    if source == 0 then return true end
    if IsPlayerAceAllowed(source, 'enhancedfx.admin') then return true end
    local object = Config.Permissions[key]
    return object ~= nil and IsPlayerAceAllowed(source, object)
end

local function permissionsFor(source)
    local result = {}
    for key in pairs(Config.Permissions) do result[key] = hasPermission(source, key) end
    return result
end

local function notify(source, message, kind)
    TriggerClientEvent('enhancedfx:notify', source, trim(message, 240), kind or 'info')
end

local function primaryIdentifier(source)
    local preferred = { 'license:', 'fivem:', 'discord:', 'steam:' }
    local values = GetPlayerIdentifiers(source)
    for _, prefix in ipairs(preferred) do
        for _, identifier in ipairs(values) do
            if identifier:sub(1, #prefix) == prefix then return identifier end
        end
    end
    return values[1]
end

local function identifierWithPrefix(source, prefix)
    for _, identifier in ipairs(GetPlayerIdentifiers(source)) do
        if identifier:sub(1, #prefix) == prefix then return identifier end
    end
    return nil
end

local function addAudit(source, action, target, detail)
    local entry = {
        id = ('%d-%04d'):format(os.time(), math.random(0, 9999)),
        time = os.time(),
        actor = source == 0 and 'Console' or (GetPlayerName(source) or ('ID ' .. source)),
        actorId = source,
        action = trim(action, 48),
        target = trim(target, 80),
        detail = trim(detail, 220)
    }
    table.insert(audit, 1, entry)
    while #audit > Config.MaxAuditEntries do table.remove(audit) end
    saveFile('data/audit.json', audit)
end

local function playerSummary(id)
    id = tonumber(id)
    if not id or not GetPlayerName(id) then return nil end
    local ped = GetPlayerPed(id)
    local health, armor = 0, 0
    if ped and ped ~= 0 then
        local healthOk, healthValue = pcall(GetEntityHealth, ped)
        local armorOk, armorValue = pcall(GetPedArmour, ped)
        health = healthOk and healthValue or 0
        armor = armorOk and armorValue or 0
    end
    return {
        id = id,
        name = GetPlayerName(id),
        ping = GetPlayerPing(id),
        bucket = GetPlayerRoutingBucket(id),
        health = health,
        armor = armor,
        joined = joins[id] or os.time(),
        frozen = frozen[id] == true,
        cuffed = cuffed[id] == true,
        cfxId = identifierWithPrefix(id, 'fivem:')
    }
end

local function playersList()
    local result = {}
    for _, value in ipairs(GetPlayers()) do
        local player = playerSummary(value)
        if player then result[#result + 1] = player end
    end
    table.sort(result, function(a, b) return a.id < b.id end)
    return result
end

local function resourcesList()
    local result = {}
    for index = 0, GetNumResources() - 1 do
        local name = GetResourceByFindIndex(index)
        if name then
            result[#result + 1] = {
                name = name,
                state = GetResourceState(name),
                protected = Config.ProtectedResources[name] == true
            }
        end
    end
    table.sort(result, function(a, b) return a.name:lower() < b.name:lower() end)
    return result
end

local function activeBans()
    local now = os.time()
    local changed = false
    for index = #bans, 1, -1 do
        if bans[index].expires and bans[index].expires > 0 and bans[index].expires <= now then
            table.remove(bans, index)
            changed = true
        end
    end
    if changed then saveFile('data/bans.json', bans) end
    return bans
end

local function bansForUi()
    local result = {}
    for _, ban in ipairs(activeBans()) do
        result[#result + 1] = {
            id = ban.id,
            player = ban.player,
            reason = ban.reason,
            admin = ban.admin,
            created = ban.created,
            expires = ban.expires
        }
    end
    return result
end

local function snapshot(source)
    local permissions = permissionsFor(source)
    local pingTotal = 0
    local online = GetPlayers()
    for _, id in ipairs(online) do pingTotal = pingTotal + math.max(0, GetPlayerPing(id)) end
    local startedResources = 0
    for index = 0, GetNumResources() - 1 do
        local name = GetResourceByFindIndex(index)
        if name and GetResourceState(name) == 'started' then startedResources = startedResources + 1 end
    end
    return {
        brand = Config.BrandName,
        accent = Config.Accent,
        serverName = GetConvar('sv_hostname', 'FiveM Server'),
        permissions = permissions,
        players = permissions.players and playersList() or {},
        reports = permissions.reports and reports or {},
        resources = permissions.resources and resourcesList() or {},
        bans = permissions.ban and bansForUi() or {},
        audit = permissions.logs and audit or {},
        density = density,
        catalogs = {
            items = permissions.items and Config.Items or {},
            weapons = permissions.weapons and Config.Weapons or {}
        },
        features = {
            framework = settings.framework or 'standalone',
            clothing = Config.ClothingEvent ~= ''
        },
        permissionObjects = Config.Permissions,
        stats = {
            online = #online,
            reports = #reports,
            bans = #activeBans(),
            resources = GetNumResources(),
            startedResources = startedResources,
            averagePing = #online > 0 and math.floor(pingTotal / #online) or 0,
            oneSync = GetConvar('onesync', 'off'),
            uptime = math.floor(GetGameTimer() / 1000)
        }
    }
end

local function pushSnapshot(source)
    TriggerClientEvent('enhancedfx:snapshot', source, snapshot(source))
end

local function refreshAdmins()
    for _, value in ipairs(GetPlayers()) do
        local id = tonumber(value)
        if hasPermission(id, 'menu') then pushSnapshot(id) end
    end
end

local function allowedRate(source)
    local now = GetGameTimer()
    if rateLimits[source] and now - rateLimits[source] < 250 then return false end
    rateLimits[source] = now
    return true
end

local function validTarget(value)
    local id = tonumber(value)
    return id and id > 0 and GetPlayerName(id) and id or nil
end

local function catalogHas(catalog, name)
    for _, entry in ipairs(catalog or {}) do
        if entry.name == name then return true end
    end
    return false
end

local function detectFramework()
    local configured = tostring(Config.Framework or 'auto'):lower()
    if configured ~= 'auto' then return configured end
    if GetResourceState('ox_inventory') == 'started' then return 'ox' end
    if GetResourceState('qb-core') == 'started' then return 'qb' end
    if GetResourceState('es_extended') == 'started' then return 'esx' end
    return 'standalone'
end

local function giveItem(target, item, amount)
    local framework = detectFramework()
    if framework == 'ox' then
        local ok, result = pcall(function() return exports.ox_inventory:AddItem(target, item, amount) end)
        return ok and result ~= false, 'ox_inventory'
    elseif framework == 'qb' then
        local ok, result = pcall(function()
            local player = exports['qb-core']:GetCoreObject().Functions.GetPlayer(target)
            return player and player.Functions.AddItem(item, amount, false, false, 'enhancedfx-admin')
        end)
        return ok and result ~= false, 'QBCore'
    elseif framework == 'esx' then
        local ok, result = pcall(function()
            local player = exports.es_extended:getSharedObject().GetPlayerFromId(target)
            if not player then return false end
            player.addInventoryItem(item, amount)
            return true
        end)
        return ok and result ~= false, 'ESX'
    end
    return false, 'No supported inventory is running'
end

local function clearInventory(target)
    local framework = detectFramework()
    if framework == 'ox' then
        return pcall(function() exports.ox_inventory:ClearInventory(target) end), 'ox_inventory'
    elseif framework == 'qb' then
        local ok, result = pcall(function()
            local player = exports['qb-core']:GetCoreObject().Functions.GetPlayer(target)
            if not player then return false end
            for _, item in pairs(player.PlayerData.items or {}) do
                if item.name and item.amount and item.amount > 0 then
                    player.Functions.RemoveItem(item.name, item.amount, item.slot, 'enhancedfx-admin')
                end
            end
            return true
        end)
        return ok and result ~= false, 'QBCore'
    elseif framework == 'esx' then
        local ok, result = pcall(function()
            local player = exports.es_extended:getSharedObject().GetPlayerFromId(target)
            if not player then return false end
            for _, item in pairs(player.getInventory() or {}) do
                if item.name and item.count and item.count > 0 then player.removeInventoryItem(item.name, item.count) end
            end
            return true
        end)
        return ok and result ~= false, 'ESX'
    end
    return false, 'No supported inventory is running'
end

local function clampDensity(value)
    return math.max(0.0, math.min(1.0, tonumber(value) or 1.0))
end

local function saveDensity(values)
    density = {
        traffic = clampDensity(values.traffic),
        parked = clampDensity(values.parked),
        random = clampDensity(values.random),
        pedestrians = clampDensity(values.pedestrians),
        scenarios = clampDensity(values.scenarios)
    }
    settings.density = density
    settings.framework = detectFramework()
    saveFile('data/settings.json', settings)
end

bans = decodeFile('data/bans.json', {})
audit = decodeFile('data/audit.json', {})
settings = decodeFile('data/settings.json', {})
saveDensity(type(settings.density) == 'table' and settings.density or Config.Density)

AddEventHandler('playerJoining', function()
    joins[source] = os.time()
    local player = source
    SetTimeout(2500, function()
        if GetPlayerName(player) then TriggerClientEvent('enhancedfx:clientAction', player, 'density', density) end
    end)
end)

AddEventHandler('playerDropped', function(reason)
    joins[source] = nil
    frozen[source] = nil
    cuffed[source] = nil
    rateLimits[source] = nil
    SetTimeout(500, refreshAdmins)
end)

AddEventHandler('playerConnecting', function(name, setKickReason)
    local source = source
    local identifiers = GetPlayerIdentifiers(source)
    local now = os.time()
    for _, ban in ipairs(activeBans()) do
        for _, identifier in ipairs(identifiers) do
            if ban.identifier == identifier then
                local expiry = ban.expires == 0 and 'Permanent' or os.date('!%Y-%m-%d %H:%M UTC', ban.expires)
                setKickReason(('EnhancedFX ban\nReason: %s\nExpires: %s\nBan ID: %s'):format(ban.reason or 'No reason', expiry, ban.id or 'unknown'))
                CancelEvent()
                return
            end
        end
    end
end)

RegisterNetEvent('enhancedfx:requestOpen', function()
    local source = source
    if not hasPermission(source, 'menu') then
        notify(source, 'You do not have permission to open EnhancedFX Admin.', 'error')
        return
    end
    TriggerClientEvent('enhancedfx:open', source, snapshot(source))
end)

RegisterNetEvent('enhancedfx:requestSnapshot', function()
    local source = source
    if hasPermission(source, 'menu') then pushSnapshot(source) end
end)

RegisterNetEvent('enhancedfx:action', function(action, data)
    local source = source
    if not hasPermission(source, 'menu') or not allowedRate(source) then return end
    action = trim(action, 48)
    data = type(data) == 'table' and data or {}
    local target = validTarget(data.target)

    if action == 'player.message' and hasPermission(source, 'players') and target then
        local message = trim(data.reason, 180)
        if message ~= '' then
            notify(target, ('Staff message from %s: %s'):format(GetPlayerName(source) or 'Staff', message), 'info')
            notify(source, 'Private staff message sent.', 'success')
            addAudit(source, 'MESSAGE', ('%s [%d]'):format(GetPlayerName(target), target), message)
        end
    elseif action == 'player.warn' and hasPermission(source, 'warn') and target then
        local reason = trim(data.reason, 180)
        notify(target, ('Staff warning from %s: %s'):format(GetPlayerName(source) or 'Staff', reason ~= '' and reason or 'Please follow the server rules.'), 'warning')
        addAudit(source, 'WARN', ('%s [%d]'):format(GetPlayerName(target), target), reason)
    elseif action == 'player.kick' and hasPermission(source, 'kick') and target then
        local reason = trim(data.reason, 180)
        addAudit(source, 'KICK', ('%s [%d]'):format(GetPlayerName(target), target), reason)
        DropPlayer(target, reason ~= '' and reason or 'Removed by server staff')
    elseif action == 'player.ban' and hasPermission(source, 'ban') and target then
        local identifier = primaryIdentifier(target)
        if not identifier then notify(source, 'That player has no usable identifier.', 'error') return end
        local hours = math.max(0, math.min(87600, tonumber(data.hours) or Config.DefaultBanHours))
        local reason = trim(data.reason, 180)
        local ban = {
            id = ('EFX-%d-%04d'):format(os.time(), math.random(0, 9999)),
            identifier = identifier,
            player = GetPlayerName(target),
            reason = reason ~= '' and reason or 'Banned by server staff',
            admin = GetPlayerName(source) or 'Staff',
            created = os.time(),
            expires = hours == 0 and 0 or (os.time() + math.floor(hours * 3600))
        }
        table.insert(bans, 1, ban)
        while #bans > Config.MaxBanEntries do table.remove(bans) end
        saveFile('data/bans.json', bans)
        addAudit(source, 'BAN', ('%s [%d]'):format(ban.player, target), ban.reason .. (hours == 0 and ' • permanent' or (' • ' .. hours .. 'h')))
        DropPlayer(target, ('%s\nBan ID: %s'):format(ban.reason, ban.id))
    elseif action == 'ban.remove' and hasPermission(source, 'ban') then
        local id = trim(data.id, 64)
        for index, ban in ipairs(bans) do
            if ban.id == id then
                table.remove(bans, index)
                saveFile('data/bans.json', bans)
                addAudit(source, 'UNBAN', ban.player or id, id)
                notify(source, 'Ban removed.', 'success')
                break
            end
        end
    elseif action == 'player.freeze' and hasPermission(source, 'players') and target then
        frozen[target] = not frozen[target]
        TriggerClientEvent('enhancedfx:clientAction', target, 'freeze', { enabled = frozen[target] })
        addAudit(source, frozen[target] and 'FREEZE' or 'UNFREEZE', ('%s [%d]'):format(GetPlayerName(target), target), '')
    elseif action == 'player.cuff' and hasPermission(source, 'players') and target then
        cuffed[target] = not cuffed[target]
        TriggerClientEvent('enhancedfx:clientAction', target, 'cuff', { enabled = cuffed[target] })
        addAudit(source, cuffed[target] and 'CUFF' or 'UNCUFF', ('%s [%d]'):format(GetPlayerName(target), target), '')
    elseif (action == 'player.heal' or action == 'player.armor' or action == 'player.revive' or action == 'player.kill' or action == 'player.clearTasks' or action == 'player.drop') and hasPermission(source, 'players') and target then
        local effect = action:match('player%.(.+)')
        TriggerClientEvent('enhancedfx:clientAction', target, effect, {})
        addAudit(source, effect:upper(), ('%s [%d]'):format(GetPlayerName(target), target), '')
    elseif action == 'player.bucket' and hasPermission(source, 'players') and target then
        local bucket = math.max(0, math.min(9999, math.floor(tonumber(data.bucket) or 0)))
        SetPlayerRoutingBucket(target, bucket)
        addAudit(source, 'SET BUCKET', ('%s [%d]'):format(GetPlayerName(target), target), tostring(bucket))
    elseif action == 'player.clothing' and hasPermission(source, 'players') and target then
        if Config.ClothingEvent == '' then
            notify(source, 'Set ClothingEvent in config.lua to connect your clothing resource.', 'warning')
        else
            TriggerClientEvent(Config.ClothingEvent, target)
            addAudit(source, 'CLOTHING', ('%s [%d]'):format(GetPlayerName(target), target), Config.ClothingEvent)
        end
    elseif action == 'player.goto' and hasPermission(source, 'teleport') and target then
        local ped = GetPlayerPed(target)
        local coords = ped ~= 0 and GetEntityCoords(ped) or nil
        if coords then TriggerClientEvent('enhancedfx:clientAction', source, 'teleport', { x = coords.x, y = coords.y, z = coords.z }) end
        addAudit(source, 'GOTO', ('%s [%d]'):format(GetPlayerName(target), target), '')
    elseif action == 'player.bring' and hasPermission(source, 'teleport') and target then
        local ped = GetPlayerPed(source)
        local coords = ped ~= 0 and GetEntityCoords(ped) or nil
        if coords then TriggerClientEvent('enhancedfx:clientAction', target, 'teleport', { x = coords.x, y = coords.y, z = coords.z }) end
        addAudit(source, 'BRING', ('%s [%d]'):format(GetPlayerName(target), target), '')
    elseif action == 'player.spectate' and hasPermission(source, 'spectate') and target then
        TriggerClientEvent('enhancedfx:clientAction', source, 'spectate', { target = target })
        addAudit(source, 'SPECTATE', ('%s [%d]'):format(GetPlayerName(target), target), '')
    elseif action == 'personal.toggle' and hasPermission(source, 'personal') then
        local mode = trim(data.mode, 24)
        if mode == 'noclip' or mode == 'god' or mode == 'invisible' or mode == 'superjump' or mode == 'stamina' or mode == 'infiniteAmmo' or mode == 'blips' or mode == 'ids' then
            TriggerClientEvent('enhancedfx:clientAction', source, 'personal', { mode = mode })
            addAudit(source, 'PERSONAL', GetPlayerName(source) or tostring(source), mode)
        end
    elseif action == 'map.waypoint' and hasPermission(source, 'map') then
        TriggerClientEvent('enhancedfx:clientAction', source, 'map', { mode = 'waypoint' })
    elseif action == 'map.coords' and hasPermission(source, 'map') then
        local x, y, z = tonumber(data.x), tonumber(data.y), tonumber(data.z)
        if x and y and z then
            TriggerClientEvent('enhancedfx:clientAction', source, 'teleport', { x = x, y = y, z = z })
            addAudit(source, 'TELEPORT COORDS', GetPlayerName(source) or tostring(source), ('%.2f, %.2f, %.2f'):format(x, y, z))
        end
    elseif action == 'item.give' and hasPermission(source, 'items') and target then
        local item = trim(data.item, 48):lower()
        local amount = math.max(1, math.min(1000, math.floor(tonumber(data.amount) or 1)))
        if not catalogHas(Config.Items, item) then
            notify(source, 'That item is not in the EnhancedFX item catalog.', 'error')
        else
            local ok, adapter = giveItem(target, item, amount)
            if ok then
                notify(source, ('Gave %dx %s using %s.'):format(amount, item, adapter), 'success')
                addAudit(source, 'GIVE ITEM', ('%s [%d]'):format(GetPlayerName(target), target), ('%dx %s'):format(amount, item))
            else
                notify(source, ('Item action unavailable: %s.'):format(adapter), 'warning')
            end
        end
    elseif action == 'item.wipe' and hasPermission(source, 'items') and target then
        local ok, adapter = clearInventory(target)
        if ok then
            notify(source, ('Inventory cleared using %s.'):format(adapter), 'success')
            addAudit(source, 'WIPE INVENTORY', ('%s [%d]'):format(GetPlayerName(target), target), adapter)
        else
            notify(source, ('Inventory action unavailable: %s.'):format(adapter), 'warning')
        end
    elseif action == 'weapon.action' and hasPermission(source, 'weapons') and target then
        local mode = trim(data.mode, 16)
        local weapon = trim(data.weapon, 48):upper()
        local ammo = math.max(0, math.min(9999, math.floor(tonumber(data.ammo) or 120)))
        if mode == 'removeAll' then
            TriggerClientEvent('enhancedfx:clientAction', target, 'weapon', { mode = mode })
            addAudit(source, 'REMOVE ALL WEAPONS', ('%s [%d]'):format(GetPlayerName(target), target), '')
        elseif (mode == 'give' or mode == 'remove') and catalogHas(Config.Weapons, weapon) then
            TriggerClientEvent('enhancedfx:clientAction', target, 'weapon', { mode = mode, weapon = weapon, ammo = ammo })
            addAudit(source, mode == 'give' and 'GIVE WEAPON' or 'REMOVE WEAPON', ('%s [%d]'):format(GetPlayerName(target), target), weapon)
        else
            notify(source, 'That weapon action is not allowed.', 'error')
        end
    elseif action == 'vehicle.action' and hasPermission(source, 'vehicle') then
        local mode = trim(data.mode, 24)
        local allowed = { spawn = true, repair = true, clean = true, flip = true, delete = true, maxTune = true, color = true, engine = true }
        if allowed[mode] then
            local model = trim(data.model, 48)
            if model:match('^[%w_%-]*$') then
                TriggerClientEvent('enhancedfx:clientAction', source, 'vehicle', { mode = mode, model = model, color = trim(data.color, 7) })
                addAudit(source, 'VEHICLE', GetPlayerName(source) or tostring(source), mode .. (model ~= '' and (' ' .. model) or ''))
            end
        end
    elseif action == 'density.apply' and hasPermission(source, 'density') then
        saveDensity(type(data.values) == 'table' and data.values or {})
        TriggerClientEvent('enhancedfx:clientAction', -1, 'density', density)
        addAudit(source, 'DENSITY', 'Server', json.encode(density))
        notify(source, 'Population density updated for all players.', 'success')
    elseif action == 'world.weather' and hasPermission(source, 'world') then
        local weather = trim(data.weather, 24):upper()
        local allowed = { CLEAR = true, EXTRASUNNY = true, CLOUDS = true, OVERCAST = true, RAIN = true, THUNDER = true, FOGGY = true, SMOG = true, SNOW = true, XMAS = true, HALLOWEEN = true }
        if allowed[weather] then
            TriggerClientEvent('enhancedfx:clientAction', -1, 'weather', { weather = weather })
            addAudit(source, 'WEATHER', 'Server', weather)
        end
    elseif action == 'world.time' and hasPermission(source, 'world') then
        local hour = math.max(0, math.min(23, tonumber(data.hour) or 12))
        local minute = math.max(0, math.min(59, tonumber(data.minute) or 0))
        TriggerClientEvent('enhancedfx:clientAction', -1, 'time', { hour = hour, minute = minute })
        addAudit(source, 'TIME', 'Server', ('%02d:%02d'):format(hour, minute))
    elseif action == 'world.announce' and hasPermission(source, 'world') then
        local message = trim(data.message, 180)
        if message ~= '' then
            TriggerClientEvent('enhancedfx:announcement', -1, message, GetPlayerName(source) or 'Staff')
            addAudit(source, 'ANNOUNCE', 'Server', message)
        end
    elseif action == 'report.claim' and hasPermission(source, 'reports') then
        local id = tonumber(data.id)
        for _, report in ipairs(reports) do
            if report.id == id then report.claimedBy = GetPlayerName(source) or ('ID ' .. source); report.status = 'claimed'; break end
        end
        addAudit(source, 'REPORT CLAIM', tostring(id or ''), '')
    elseif action == 'report.resolve' and hasPermission(source, 'reports') then
        local id = tonumber(data.id)
        for index, report in ipairs(reports) do
            if report.id == id then table.remove(reports, index); break end
        end
        addAudit(source, 'REPORT RESOLVE', tostring(id or ''), trim(data.note, 120))
    elseif action == 'resource.action' and hasPermission(source, 'resources') then
        local name = trim(data.name, 80)
        local mode = trim(data.mode, 16)
        if name == '' or Config.ProtectedResources[name] then
            notify(source, 'That resource is protected.', 'error')
        elseif GetResourceState(name) == 'missing' or not name:match('^[%w_%-%[%]%.]+$') then
            notify(source, 'Resource not found.', 'error')
        elseif mode == 'start' then
            StartResource(name)
            addAudit(source, 'RESOURCE START', name, '')
        elseif mode == 'stop' then
            StopResource(name)
            addAudit(source, 'RESOURCE STOP', name, '')
        elseif mode == 'restart' then
            StopResource(name)
            SetTimeout(500, function() StartResource(name) end)
            addAudit(source, 'RESOURCE RESTART', name, '')
        end
    end

    SetTimeout(250, refreshAdmins)
end)

RegisterCommand(Config.ReportCommand, function(source, args)
    if source == 0 then return end
    local message = trim(table.concat(args, ' '), 240)
    if message == '' then
        notify(source, ('Usage: /%s <message>'):format(Config.ReportCommand), 'warning')
        return
    end
    reportSequence = reportSequence + 1
    table.insert(reports, 1, {
        id = reportSequence,
        playerId = source,
        player = GetPlayerName(source) or ('ID ' .. source),
        message = message,
        created = os.time(),
        status = 'open'
    })
    while #reports > 100 do table.remove(reports) end
    notify(source, 'Your report was sent to online staff.', 'success')
    refreshAdmins()
end, false)

RegisterCommand('efxadmin_refresh', function(source)
    if source == 0 then refreshAdmins() end
end, true)

print(('[%s] Loaded %d bans and %d audit entries.'):format(RESOURCE, #bans, #audit))


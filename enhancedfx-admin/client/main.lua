local Config = EnhancedFXAdmin
local menuOpen = false
local personal = { noclip = false, god = false, invisible = false, superjump = false, stamina = false, infiniteAmmo = false, blips = false, ids = false }
local spectating = false
local frozen = false
local cuffed = false
local population = { traffic = 1.0, parked = 1.0, random = 1.0, pedestrians = 1.0, scenarios = 1.0 }
local playerBlips = {}

local function nui(message)
    SendNUIMessage(message)
end

local function closeMenu()
    menuOpen = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    nui({ type = 'close' })
end

RegisterNetEvent('enhancedfx:open', function(snapshot)
    menuOpen = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    nui({ type = 'open', payload = snapshot })
end)

RegisterNetEvent('enhancedfx:snapshot', function(snapshot)
    nui({ type = 'snapshot', payload = snapshot })
end)

RegisterNetEvent('enhancedfx:notify', function(message, kind)
    nui({ type = 'toast', message = message, kind = kind or 'info' })
end)

RegisterNetEvent('enhancedfx:announcement', function(message, author)
    nui({ type = 'announcement', message = message, author = author })
end)

RegisterCommand(Config.OpenCommand, function()
    if menuOpen then closeMenu() else TriggerServerEvent('enhancedfx:requestOpen') end
end, false)

RegisterKeyMapping(Config.OpenCommand, 'Open EnhancedFX Admin', 'keyboard', Config.DefaultKey)

CreateThread(function()
    while true do
        if menuOpen then
            local ped = PlayerPedId()
            local entity = ped
            if IsPedInAnyVehicle(ped, false) then entity = GetVehiclePedIsIn(ped, false) end
            local c = GetEntityCoords(entity)
            nui({ type = 'coords', coords = { x = c.x, y = c.y, z = c.z, h = GetEntityHeading(entity) } })
            Wait(200)
        else
            Wait(500)
        end
    end
end)

RegisterNUICallback('close', function(_, callback)
    closeMenu()
    callback({ ok = true })
end)

RegisterNUICallback('refresh', function(_, callback)
    TriggerServerEvent('enhancedfx:requestSnapshot')
    callback({ ok = true })
end)

RegisterNUICallback('action', function(data, callback)
    if type(data) ~= 'table' or type(data.action) ~= 'string' then callback({ ok = false }) return end
    TriggerServerEvent('enhancedfx:action', data.action, type(data.data) == 'table' and data.data or {})
    callback({ ok = true })
end)

RegisterNUICallback('dock', function(data, callback)
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(type(data) == 'table' and data.enabled == true)
    callback({ ok = true })
end)

local function cameraDirection()
    local rotation = GetGameplayCamRot(2)
    local z = math.rad(rotation.z)
    local x = math.rad(rotation.x)
    local cosX = math.abs(math.cos(x))
    return vector3(-math.sin(z) * cosX, math.cos(z) * cosX, math.sin(x))
end

local function setNoclip(enabled)
    personal.noclip = enabled
    local ped = PlayerPedId()
    FreezeEntityPosition(ped, enabled)
    SetEntityCollision(ped, not enabled, not enabled)
    SetEntityInvincible(ped, enabled or personal.god)
    if not enabled then SetEntityVelocity(ped, 0.0, 0.0, 0.0) end
end

CreateThread(function()
    while true do
        if personal.noclip then
            Wait(0)
            local ped = PlayerPedId()
            local entity = IsPedInAnyVehicle(ped, false) and GetVehiclePedIsIn(ped, false) or ped
            local position = GetEntityCoords(entity)
            local direction = cameraDirection()
            local right = vector3(direction.y, -direction.x, 0.0)
            local speed = IsControlPressed(0, 21) and 3.0 or (IsControlPressed(0, 36) and 0.25 or 1.0)
            if IsControlPressed(0, 32) then position = position + direction * speed end
            if IsControlPressed(0, 33) then position = position - direction * speed end
            if IsControlPressed(0, 34) then position = position - right * speed end
            if IsControlPressed(0, 35) then position = position + right * speed end
            if IsControlPressed(0, 22) then position = position + vector3(0.0, 0.0, speed) end
            if IsControlPressed(0, 44) then position = position - vector3(0.0, 0.0, speed) end
            SetEntityCoordsNoOffset(entity, position.x, position.y, position.z, true, true, true)
            SetEntityVelocity(entity, 0.0, 0.0, 0.0)
            SetEntityCollision(entity, false, false)
            FreezeEntityPosition(entity, true)
        else
            Wait(300)
        end
    end
end)

CreateThread(function()
    while true do
        if personal.stamina then RestorePlayerStamina(PlayerId(), 1.0) end
        if personal.infiniteAmmo then
            SetPedInfiniteAmmoClip(PlayerPedId(), true)
        end
        if personal.stamina or personal.infiniteAmmo then Wait(0) else Wait(300) end
    end
end)

local function drawPlayerId(x, y, z, text)
    local visible, sx, sy = World3dToScreen2d(x, y, z)
    if not visible then return end
    SetTextScale(0.0, 0.30)
    SetTextFont(0)
    SetTextProportional(1)
    SetTextColour(255, 255, 255, 220)
    SetTextCentre(true)
    SetTextOutline()
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(sx, sy)
end

CreateThread(function()
    while true do
        if personal.blips or personal.ids then
            local myCoords = GetEntityCoords(PlayerPedId())
            local seen = {}
            for _, player in ipairs(GetActivePlayers()) do
                if player ~= PlayerId() then
                    local ped = GetPlayerPed(player)
                    local serverId = GetPlayerServerId(player)
                    seen[player] = true
                    if personal.blips then
                        if not playerBlips[player] or not DoesBlipExist(playerBlips[player]) then
                            playerBlips[player] = AddBlipForEntity(ped)
                            SetBlipSprite(playerBlips[player], 1)
                            SetBlipScale(playerBlips[player], 0.72)
                            SetBlipColour(playerBlips[player], 3)
                            ShowHeadingIndicatorOnBlip(playerBlips[player], true)
                        end
                    elseif playerBlips[player] and DoesBlipExist(playerBlips[player]) then
                        RemoveBlip(playerBlips[player])
                        playerBlips[player] = nil
                    end
                    if personal.ids then
                        local coords = GetEntityCoords(ped)
                        if #(myCoords - coords) < 75.0 then drawPlayerId(coords.x, coords.y, coords.z + 1.05, ('[%d] %s'):format(serverId, GetPlayerName(player))) end
                    end
                end
            end
            for player, blip in pairs(playerBlips) do
                if not seen[player] or not personal.blips then
                    if DoesBlipExist(blip) then RemoveBlip(blip) end
                    playerBlips[player] = nil
                end
            end
            Wait(0)
        else
            Wait(500)
        end
    end
end)

CreateThread(function()
    while true do
        SetVehicleDensityMultiplierThisFrame(population.traffic)
        SetRandomVehicleDensityMultiplierThisFrame(population.random)
        SetParkedVehicleDensityMultiplierThisFrame(population.parked)
        SetPedDensityMultiplierThisFrame(population.pedestrians)
        SetScenarioPedDensityMultiplierThisFrame(population.scenarios, population.scenarios)
        Wait(0)
    end
end)

CreateThread(function()
    while true do
        if cuffed then
            DisableControlAction(0, 21, true)
            DisableControlAction(0, 22, true)
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 37, true)
            DisableControlAction(0, 44, true)
            DisableControlAction(0, 75, true)
            Wait(0)
        else
            Wait(300)
        end
    end
end)

CreateThread(function()
    while true do
        if personal.superjump then
            Wait(0)
            SetSuperJumpThisFrame(PlayerId())
        else
            Wait(300)
        end
    end
end)

local function vehicleAction(data)
    local ped = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(ped, false)
    if data.mode == 'spawn' then
        local modelName = tostring(data.model or '')
        local model = GetHashKey(modelName)
        if modelName == '' or not IsModelInCdimage(model) or not IsModelAVehicle(model) then
            nui({ type = 'toast', message = 'That vehicle model is not valid.', kind = 'error' })
            return
        end
        RequestModel(model)
        local timeout = GetGameTimer() + 5000
        while not HasModelLoaded(model) and GetGameTimer() < timeout do Wait(0) end
        if not HasModelLoaded(model) then return end
        local coords = GetEntityCoords(ped)
        vehicle = CreateVehicle(model, coords.x, coords.y, coords.z, GetEntityHeading(ped), true, true)
        SetPedIntoVehicle(ped, vehicle, -1)
        SetVehicleOnGroundProperly(vehicle)
        SetEntityAsMissionEntity(vehicle, true, true)
        SetModelAsNoLongerNeeded(model)
    elseif vehicle == 0 then
        nui({ type = 'toast', message = 'Get inside a vehicle first.', kind = 'warning' })
    elseif data.mode == 'repair' then
        SetVehicleFixed(vehicle)
        SetVehicleDeformationFixed(vehicle)
        SetVehicleEngineHealth(vehicle, 1000.0)
        SetVehiclePetrolTankHealth(vehicle, 1000.0)
    elseif data.mode == 'clean' then
        SetVehicleDirtLevel(vehicle, 0.0)
        WashDecalsFromVehicle(vehicle, 1.0)
    elseif data.mode == 'flip' then
        SetVehicleOnGroundProperly(vehicle)
    elseif data.mode == 'delete' then
        NetworkRequestControlOfEntity(vehicle)
        SetEntityAsMissionEntity(vehicle, true, true)
        DeleteVehicle(vehicle)
    elseif data.mode == 'engine' then
        SetVehicleEngineOn(vehicle, not GetIsVehicleEngineRunning(vehicle), false, true)
    elseif data.mode == 'maxTune' then
        SetVehicleModKit(vehicle, 0)
        for modType = 0, 49 do
            local count = GetNumVehicleMods(vehicle, modType)
            if count and count > 0 then SetVehicleMod(vehicle, modType, count - 1, false) end
        end
        ToggleVehicleMod(vehicle, 18, true)
        ToggleVehicleMod(vehicle, 20, true)
        ToggleVehicleMod(vehicle, 22, true)
    elseif data.mode == 'color' then
        local value = tostring(data.color or '#ff5a36'):gsub('#', '')
        if value:match('^%x%x%x%x%x%x$') then
            local red = tonumber(value:sub(1, 2), 16)
            local green = tonumber(value:sub(3, 4), 16)
            local blue = tonumber(value:sub(5, 6), 16)
            SetVehicleCustomPrimaryColour(vehicle, red, green, blue)
            SetVehicleCustomSecondaryColour(vehicle, red, green, blue)
        end
    end
end

RegisterNetEvent('enhancedfx:clientAction', function(action, data)
    data = type(data) == 'table' and data or {}
    local ped = PlayerPedId()
    if action == 'freeze' then
        frozen = data.enabled == true
        FreezeEntityPosition(ped, frozen)
        nui({ type = 'toast', message = frozen and 'You were frozen by staff.' or 'You were unfrozen by staff.', kind = frozen and 'warning' or 'success' })
    elseif action == 'heal' then
        SetEntityHealth(ped, GetEntityMaxHealth(ped))
        ClearPedBloodDamage(ped)
    elseif action == 'armor' then
        SetPedArmour(ped, 100)
    elseif action == 'revive' then
        local coords = GetEntityCoords(ped)
        NetworkResurrectLocalPlayer(coords.x, coords.y, coords.z, GetEntityHeading(ped), true, false)
        SetEntityHealth(PlayerPedId(), GetEntityMaxHealth(PlayerPedId()))
        ClearPedBloodDamage(PlayerPedId())
    elseif action == 'kill' then
        SetEntityHealth(ped, 0)
    elseif action == 'drop' then
        local coords = GetEntityCoords(ped)
        GiveWeaponToPed(ped, GetHashKey('GADGET_PARACHUTE'), 1, false, true)
        SetEntityCoords(ped, coords.x, coords.y, coords.z + 80.0, false, false, false, false)
    elseif action == 'clearTasks' then
        ClearPedTasksImmediately(ped)
    elseif action == 'cuff' then
        cuffed = data.enabled == true
        SetEnableHandcuffs(ped, cuffed)
        SetCurrentPedWeapon(ped, GetHashKey('WEAPON_UNARMED'), true)
        if cuffed then
            RequestAnimDict('mp_arresting')
            while not HasAnimDictLoaded('mp_arresting') do Wait(0) end
            TaskPlayAnim(ped, 'mp_arresting', 'idle', 8.0, -8.0, -1, 49, 0, false, false, false)
        else
            StopAnimTask(ped, 'mp_arresting', 'idle', 3.0)
            ClearPedSecondaryTask(ped)
        end
    elseif action == 'teleport' then
        local entity = IsPedInAnyVehicle(ped, false) and GetVehiclePedIsIn(ped, false) or ped
        SetEntityCoords(entity, tonumber(data.x) or 0.0, tonumber(data.y) or 0.0, (tonumber(data.z) or 0.0) + 1.0, false, false, false, false)
    elseif action == 'spectate' then
        local targetPlayer = GetPlayerFromServerId(tonumber(data.target) or -1)
        if targetPlayer == -1 then return end
        spectating = not spectating
        NetworkSetInSpectatorMode(spectating, GetPlayerPed(targetPlayer))
        nui({ type = 'toast', message = spectating and 'Spectating player. Run the action again to stop.' or 'Spectate stopped.', kind = 'info' })
    elseif action == 'personal' then
        local mode = tostring(data.mode or '')
        if mode == 'noclip' then
            setNoclip(not personal.noclip)
        elseif mode == 'god' then
            personal.god = not personal.god
            SetEntityInvincible(ped, personal.god or personal.noclip)
        elseif mode == 'invisible' then
            personal.invisible = not personal.invisible
            SetEntityVisible(ped, not personal.invisible, false)
        elseif mode == 'superjump' then
            personal.superjump = not personal.superjump
        elseif mode == 'stamina' then
            personal.stamina = not personal.stamina
        elseif mode == 'infiniteAmmo' then
            personal.infiniteAmmo = not personal.infiniteAmmo
            if not personal.infiniteAmmo then SetPedInfiniteAmmoClip(ped, false) end
        elseif mode == 'blips' then
            personal.blips = not personal.blips
        elseif mode == 'ids' then
            personal.ids = not personal.ids
        end
        nui({ type = 'personalState', state = personal })
    elseif action == 'vehicle' then
        vehicleAction(data)
    elseif action == 'weapon' then
        local weapon = GetHashKey(tostring(data.weapon or ''))
        if data.mode == 'give' then
            GiveWeaponToPed(ped, weapon, tonumber(data.ammo) or 120, false, true)
        elseif data.mode == 'remove' then
            RemoveWeaponFromPed(ped, weapon)
        elseif data.mode == 'removeAll' then
            RemoveAllPedWeapons(ped, true)
        end
    elseif action == 'map' and data.mode == 'waypoint' then
        local waypoint = GetFirstBlipInfoId(8)
        if DoesBlipExist(waypoint) then
            local coords = GetBlipInfoIdCoord(waypoint)
            local entity = IsPedInAnyVehicle(ped, false) and GetVehiclePedIsIn(ped, false) or ped
            local found, ground = false, 0.0
            for height = 1000, 0, -50 do
                SetEntityCoordsNoOffset(entity, coords.x, coords.y, height + 0.0, false, false, false)
                Wait(10)
                found, ground = GetGroundZFor_3dCoord(coords.x, coords.y, height + 0.0, false)
                if found then break end
            end
            SetEntityCoords(entity, coords.x, coords.y, found and ground + 1.0 or 50.0, false, false, false, false)
        else
            nui({ type = 'toast', message = 'Place a waypoint on the map first.', kind = 'warning' })
        end
    elseif action == 'density' then
        population.traffic = tonumber(data.traffic) or 1.0
        population.parked = tonumber(data.parked) or 1.0
        population.random = tonumber(data.random) or 1.0
        population.pedestrians = tonumber(data.pedestrians) or 1.0
        population.scenarios = tonumber(data.scenarios) or 1.0
    elseif action == 'weather' then
        local weather = tostring(data.weather or 'CLEAR')
        SetWeatherTypeOvertimePersist(weather, 2.0)
        Wait(2000)
        SetWeatherTypeNowPersist(weather)
    elseif action == 'time' then
        NetworkOverrideClockTime(tonumber(data.hour) or 12, tonumber(data.minute) or 0, 0)
    end
end)

AddEventHandler('onClientResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    closeMenu()
    if spectating then NetworkSetInSpectatorMode(false, PlayerPedId()) end
    personal.noclip = false
    local ped = PlayerPedId()
    FreezeEntityPosition(ped, frozen)
    SetEntityCollision(ped, true, true)
    SetEntityVisible(ped, true, false)
    SetEntityInvincible(ped, false)
    SetEnableHandcuffs(ped, false)
    for _, blip in pairs(playerBlips) do if DoesBlipExist(blip) then RemoveBlip(blip) end end
end)


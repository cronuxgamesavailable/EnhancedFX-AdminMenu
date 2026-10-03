EnhancedFXAdmin = {
    OpenCommand = 'efxadmin',
    DefaultKey = 'F10',
    ReportCommand = 'report',
    BrandName = 'ENHANCEDFX ADMIN',
    Accent = '#ff5a36',
    Framework = 'auto', -- auto, standalone, ox, qb, or esx
    ClothingEvent = '', -- Optional client event used by your clothing resource.
    MaxAuditEntries = 750,
    MaxBanEntries = 1000,
    DefaultBanHours = 24,
    Items = {
        { name = 'water', label = 'Water' },
        { name = 'bread', label = 'Bread' },
        { name = 'bandage', label = 'Bandage' },
        { name = 'phone', label = 'Phone' },
        { name = 'radio', label = 'Radio' },
        { name = 'lockpick', label = 'Lockpick' },
        { name = 'repairkit', label = 'Repair Kit' }
    },
    Weapons = {
        { name = 'WEAPON_PISTOL', label = 'Pistol' },
        { name = 'WEAPON_COMBATPISTOL', label = 'Combat Pistol' },
        { name = 'WEAPON_SMG', label = 'SMG' },
        { name = 'WEAPON_CARBINERIFLE', label = 'Carbine Rifle' },
        { name = 'WEAPON_PUMPSHOTGUN', label = 'Pump Shotgun' },
        { name = 'WEAPON_STUNGUN', label = 'Stun Gun' },
        { name = 'WEAPON_FLASHLIGHT', label = 'Flashlight' },
        { name = 'WEAPON_NIGHTSTICK', label = 'Nightstick' }
    },
    Density = {
        traffic = 1.0,
        parked = 1.0,
        random = 1.0,
        pedestrians = 1.0,
        scenarios = 1.0
    },
    ProtectedResources = {
        ['enhancedfx-admin'] = true,
        ['mapmanager'] = true,
        ['spawnmanager'] = true,
        ['sessionmanager'] = true,
        ['hardcap'] = true,
        ['chat'] = true
    },
    Permissions = {
        menu = 'enhancedfx.menu',
        players = 'enhancedfx.players',
        kick = 'enhancedfx.kick',
        ban = 'enhancedfx.ban',
        warn = 'enhancedfx.warn',
        teleport = 'enhancedfx.teleport',
        spectate = 'enhancedfx.spectate',
        personal = 'enhancedfx.personal',
        vehicle = 'enhancedfx.vehicle',
        items = 'enhancedfx.items',
        weapons = 'enhancedfx.weapons',
        density = 'enhancedfx.density',
        map = 'enhancedfx.map',
        stats = 'enhancedfx.stats',
        permissions = 'enhancedfx.permissions',
        world = 'enhancedfx.world',
        reports = 'enhancedfx.reports',
        resources = 'enhancedfx.resources',
        logs = 'enhancedfx.logs'
    }
}


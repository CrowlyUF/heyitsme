// PT strings. EN comes from index.html.

export const meta = {
  en: {
    title: 'CrowlyAC · about me',
    description: 'CrowlyAC: programming since 2018. Cheats, anticheats, CrewX and the Discord communities I help run.',
  },
  pt: {
    title: 'CrowlyAC · sobre mim',
    description: 'CrowlyAC: programando desde 2018. Cheats, anticheats, CrewX e as comunidades do Discord que eu ajudo a manter.',
  },
};

export const pt = {
  'a11y.language': 'Idioma',

  'about.kicker': 'sobre mim',
  'about.hi': 'Opa, eu sou o',
  'about.p1':
    'Comecei a programar em <b>2018</b>, e o motivo foi simples: eu queria fazer cheats para Roblox. Isso me deixou curioso sobre como os jogos funcionam por dentro, e essa curiosidade nunca passou.',
  'about.p2':
    'Desde então aprendi outras linguagens e fui para outros jogos. Hoje faço cheats para vários deles e também trabalho do outro lado, criando anticheats.',
  'about.p3': 'Falo português e inglês.',
  'about.small': 'Programo em Lua, JavaScript, Python e Kotlin, e estou aprendendo Java.',

  'profile.avatarAlt': 'Avatar de crowly.md no Discord',
  'profile.badgesLabel': 'Insígnias do Discord',
  'profile.open': 'Abrir perfil',
  'profile.copy': 'Copiar usuário',
  'profile.since': 'Membro desde',

  'cta.label': 'Veja o que eu faço',

  'wid.title': 'O que eu faço',
  'wid.admin': 'Administrador',
  'wid.mod': 'Moderador',
  'wid.since': 'desde 2023',
  'wid.ccBannerAlt': 'Banner do servidor CrackCrew',
  'wid.ccDesc': 'Uma comunidade brasileira de cheats, principalmente de Minecraft e Roblox. O CrewX tem um canal próprio lá.',
  'wid.rvBannerAlt': 'Banner do servidor Revolt',
  'wid.rvDesc': 'Uma comunidade de Roblox com um fórum próprio de scripting.',
  'wid.join': 'Entrar',
  'wid.crewxDesc':
    'Um client de Minecraft 1.8.9 para servidores brasileiros como MushMC, Hylex e Kaizen. 99 módulos, scripts em Lua e um player de mídia com letra sincronizada.',
  'wid.tech': 'Tecnologias',
  'wid.repo': 'Repositório',
  'wid.ghAvatarAlt': 'Avatar de CrowlyUF no GitHub',
  'wid.ghDesc': 'Meu GitHub, onde fica o meu código.',
  'wid.profile': 'Perfil',
};

export const runtime = {
  en: {
    members: (m, o) => `${m} members · ${o} online`,
    stars: (n) => `${n} ${n === 1 ? 'star' : 'stars'}`,
    copied: 'Copied. Paste it into Discord’s “Add Friend”.',
    copyFailed: 'Couldn’t copy. The username is crowly.md',
    copyDone: 'Copied',
    death: (name) => `${name} was blown up by Creeper`,
  },
  pt: {
    members: (m, o) => `${m} membros · ${o} online`,
    stars: (n) => `${n} ${n === 1 ? 'estrela' : 'estrelas'}`,
    copied: 'Copiado. Cole em “Adicionar amigo” no Discord.',
    copyFailed: 'Não deu para copiar. O usuário é crowly.md',
    copyDone: 'Copiado',
    death: (name) => `${name} foi explodido por Creeper`,
  },
};

var endLib = require("../libs/endgame.js");

test("Count dead adults", () =>{
    var gameState = {
        "graveyard":{
            "Hare": {
                "mother": "webbnh",
                "father": "BethMitcham",
                "age": 1,
                "food": 0,
                "gender": "male",
                "name": "Hare",
                "guardians": {
                "webbnh": 3
                }
            },
            "deadAdult1":{
                "profession":"crafter"
            },
            "deadAdult2":{
                "profession":"crafter"
            }
        }
    }
    actualMessage = endLib.countDeadAdults(gameState)
    expect(actualMessage).toBe(2)
    
});

 test("run endgame", () =>{
  let endGameState = {
    "seasonCounter": 37,
    "gameTrack": {
      "veldt": 1,
      "forest": 2,
      "marsh": 3,
      "hills": 1
    },
    "conceptionCounter": 18,
    "population": {
      "BethMitcham": {
        "gender": "male",
        "food": 12,
        "grain": 81,
        "basket": 4,
        "spearhead": 1,
        "name": "BethMitcham",
        "history": [

        ],
        "vote": "BethMitcham",
        "profession": "crafter",
        "chief": true,
        "canCraft": true,
        "worked": true,
        "nickname": "Protus",
        "noTeach": true,
        "guarding": [
          "Eagle"
        ],
        "declineList": [
          "notlink"
        ],
        "inviteList": [
          "!save",
          "!pass"
        ],
        "activity": "gather"
      },
      "notlink": {
        "gender": "female",
        "food": 12,
        "grain": 68,
        "basket": 1,
        "spearhead": 0,
        "name": "notlink",
        "history": [
        ],
        "profession": "gatherer",
        "worked": true,
        "consentList": [
          "kevinmitcham",
          "BethMitcham"
        ],
        "nickname": "Alexander",
        "guarding": [
          "Kental",
          "Laurel",
          "Pine",
          "Redhair"
        ],
        "strength": "weak",
        "nursing": [
          "Redhair"
        ],
        "inviteList": [
          "BethMitcham",
          "!save",
          "!pass"
        ],
        "activity": "gather"
      },
      "jmitcham": {
        "gender": "female",
        "food": 12,
        "grain": 68,
        "basket": 1,
        "spearhead": 0,
        "name": "notlink",
        "history": [
        ],
        "profession": "gatherer",
        "worked": true,
        "nickname": "jmitcham",
        "strength": "weak",
        "nursing": [
          "Redhair"
        ],
        "activity": "gather"
      },
      "Thor": {
        "gender": "m",
        "golem": true,
        "food": 4,
        "grain": 0,
        "basket": 0,
        "spearhead": 1,
        "profession": "hunter",
        "obeyList": [
          "hunt",
          "gather",
          "give",
          "guard",
          "ignore",
          "feed",
          "babysit"
        ],
        "name": "Thor",
        "worked": true,
        "history": [
        ],
        "activity": "hunt"
      } ,          
      "kevinmitcham": {
        "gender": "m",
        "golem": true,
        "food": 4,
        "grain": 0,
        "basket": 0,
        "spearhead": 1,
        "profession": "hunter",
        "obeyList": [
          "hunt",
          "gather",
          "give",
          "guard",
          "ignore",
          "feed",
          "babysit"
        ],
        "name": "kevinmitcham",
        "worked": true,
        "history": [
        ],
        "activity": "hunt"
      } ,
      "dougbeal": {
        "gender": "f",
        "food": 4,
        "grain": 0,
        "basket": 0,
        "spearhead": 1,
        "profession": "hunter",
        "name": "dougbeal",
        "worked": true,
        "history": [
        ],
        "activity": "hunt"
      }
    },
    "graveyard": {
      "Gray": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 3,
        "food": 0,
        "gender": "male",
        "name": "Gray",
        "guardians": {
          "notlink": 2
        },
        "deathMessage": "alligator attack",
        "deathSeason": 22
      },
      "Iron": {
        "gender": "m",
        "golem": true,
        "food": 0,
        "grain": 0,
        "basket": 0,
        "spearhead": 0,
        "profession": "gatherer",
        "obeyList": [
          "hunt",
          "gather",
          "give",
          "guard",
          "ignore",
          "feed",
          "babysit"
        ],
        "name": "Iron",
        "worked": false,
        "history": [
],
        "guarding": [
          "Akkz"
        ],
        "deathMessage": "starvation",
        "deathSeason": 26
      }
    },
    "children": {
      "Akkz": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 29,
        "food": 2,
        "gender": "male",
        "name": "Akkz",
        "guardians": {},
        "babysitting": "Dani",
        "newAdult": true
      },
      "Bison": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 27,
        "food": 2,
        "gender": "male",
        "name": "Bison",
        "guardians": {},
        "babysitting": "Jewel",
        "newAdult": true
      },
      "Cat": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 25,
        "food": 2,
        "gender": "female",
        "name": "Cat",
        "guardians": {
          "BethMitcham": 2
        },
        "newAdult": true,
        "babysitting": "Ilex"
      },
      "Dani": {
        "mother": "jmitcham",
        "father": "BethMitcham",
        "age": 21,
        "food": 0,
        "gender": "female",
        "name": "Dani",
        "guardians": {
          "Akkz": 1
        }
      },
      "Eagle": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 19,
        "food": 0,
        "gender": "female",
        "name": "Eagle",
        "guardians": {
          "BethMitcham": 1
        }
      },
      "Forest": {
        "mother": "jmitcham",
        "father": "BethMitcham",
        "age": 18,
        "food": 0,
        "gender": "female",
        "name": "Forest",
        "guardians": {}
      },
      "Hazel": {
        "mother": "jmitcham",
        "father": "BethMitcham",
        "age": 18,
        "food": 0,
        "gender": "female",
        "name": "Hazel",
        "guardians": {}
      },
      "Ilex": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "age": 16,
        "food": 0,
        "gender": "male",
        "name": "Ilex",
        "guardians": {
          "Cat": 1
        }
      },
      "Jewel": {
        "mother": "jmitcham",
        "father": "kevinmitcham",
        "age": 13,
        "food": 0,
        "gender": "male",
        "name": "Jewel",
        "guardians": {
          "Bison": 1
        }
      },
      "Kental": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 12,
        "food": 0,
        "gender": "female",
        "name": "Kental",
        "guardians": {
          "notlink": 4
        }
      },
      "Laurel": {
        "mother": "notlink",
        "father": "kevinmitcham",
        "age": 9,
        "food": 0,
        "gender": "female",
        "name": "Laurel",
        "guardians": {
          "notlink": 4
        }
      },
      "Meadow": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "age": 9,
        "food": 0,
        "gender": "female",
        "name": "Meadow",
        "guardians": {}
      },
      "North": {
        "mother": "jmitcham",
        "father": "kevinmitcham",
        "age": 8,
        "food": 0,
        "gender": "female",
        "name": "North",
        "guardians": {}
      },
      "Olive": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "age": 5,
        "food": 0,
        "gender": "female",
        "name": "Olive",
        "guardians": {}
      },
      "Pine": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 4,
        "food": 0,
        "gender": "female",
        "name": "Pine",
        "guardians": {
          "notlink": 4
        }
      },
      "Redhair": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 1,
        "food": 0,
        "gender": "male",
        "name": "Redhair",
        "guardians": {
          "notlink": 4
        }
      }
    },
    "currentLocationName": "marsh",
    "round": "work",
    "workRound": true,
    "foodRound": false,
    "reproductionRound": false,
    "needChanceRoll": false,
    "canJerky": false,
    "lastSaved": "2022-01-17T07:23:27.152Z",
    "doneMating": false,
    "banished": {
      "ginny": {
        "gender": "male",
        "food": 2,
        "grain": 4,
        "basket": 0,
        "spearhead": 0,
        "handle": {
          "id": "781377010244649022",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "ginny",
          "bot": false,
          "discriminator": "4104",
          "avatar": null,
          "lastMessageChannelID": null,
          "createdTimestamp": 1606365196525,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/4.png",
          "tag": "ginny#4104",
          "avatarURL": null,
          "displayAvatarURL": "https://cdn.discordapp.com/embed/avatars/4.png"
        },
        "name": "ginny",
        "strength": "weak",
        "history": [
          "10: Joined the tribe",
          "10: ginny crafts[3] a basket",
          "10.5: ginny crafts[3] a basket",
          "11: You gave CAP  2 basket"
        ],
        "profession": "crafter",
        "canCraft": true,
        "worked": false,
        "nickname": null
      },
      "Cas_Mulford": {
        "gender": "male",
        "food": 25,
        "grain": 10,
        "basket": 1,
        "spearhead": 0,
        "handle": {
          "id": "694698143211847700",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "Cas_Mulford",
          "bot": false,
          "discriminator": "5858",
          "avatar": null,
          "lastMessageChannelID": null,
          "createdTimestamp": 1585699344209,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png",
          "tag": "Cas_Mulford#5858",
          "avatarURL": null,
          "displayAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png"
        },
        "name": "Cas_Mulford",
        "history": [
          "7: Joined the tribe",
          "7: BethMitcham gave you 1 basket",
          "7: Cas_Mulford gathers [7]-season clams (4) basket: [7]clams (4) basket breaks.",
          "7: jmitcham gave you 1 basket",
          "7.5: Cas_Mulford gathers [16]grain (6) basket: [7]clams (4)",
          "8: Cas_Mulford gathers [12]-season mushrooms (6) basket: [5]clams (4) basket breaks.",
          "8.5: jmitcham gave you 1 basket",
          "8.5: Cas_Mulford gathers [7]clams (4) basket: [11]turtle eggs (7)",
          "9: Cas_Mulford gathers [14]-season turtle eggs (7) basket: [3]clams (4)",
          "9.5: Cas_Mulford gathers [10]duck eggs (7) basket: [11]turtle eggs (7)",
          "10: Cas_Mulford gathers [10]-season clams (4) basket: [8]clams (4)",
          "10.5: Cas_Mulford gathers [10]duck eggs (7) basket: [5]clams (4)",
          "11.5: Cas_Mulford gathers [10]duck eggs (7) basket: [5]clams (4)"
        ],
        "profession": "gatherer",
        "worked": false,
        "nickname": null,
        "guarding": [],
        "inviteList": [
          "!save",
          "!pass"
        ]
      },
      "kevinmitcham": {
        "gender": "male",
        "food": 0,
        "grain": 4,
        "basket": 0,
        "spearhead": 0,
        "handle": {
          "id": "427681770930962435",
          "system": null,
          "locale": null,
          "flags": 0,
          "username": "kevinmitcham",
          "bot": false,
          "discriminator": "9587",
          "avatar": "590d429490ae1be623d1fe906fecdcbc",
          "lastMessageChannelID": null,
          "createdTimestamp": 1522037680133,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/2.png",
          "tag": "kevinmitcham#9587",
          "avatarURL": "https://cdn.discordapp.com/avatars/427681770930962435/590d429490ae1be623d1fe906fecdcbc.webp",
          "displayAvatarURL": "https://cdn.discordapp.com/avatars/427681770930962435/590d429490ae1be623d1fe906fecdcbc.webp"
        },
        "name": "kevinmitcham",
        "history": [
        ],
        "profession": "hunter",
        "worked": true,
        "nickname": null,
        "consentList": [
          "jmitcham",
          "notlink",
          "dougbeal"
        ],
        "inviteList": [
          "notlink",
          "jmitcham",
          "dougbeal",
          "!save",
          "!pass"
        ],
        "activity": "hunt"
      },
      "smacktodaface": {
        "gender": "male",
        "food": 0,
        "grain": 4,
        "basket": 1,
        "spearhead": 1,
        "handle": {
          "id": "213133244139307009",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "smacktodaface",
          "bot": false,
          "discriminator": "5808",
          "avatar": "4e03a1462938815e7c24c01ace5d3da4",
          "lastMessageChannelID": null,
          "createdTimestamp": 1470885325227,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png",
          "tag": "smacktodaface#5808",
          "avatarURL": "https://cdn.discordapp.com/avatars/213133244139307009/4e03a1462938815e7c24c01ace5d3da4.webp",
          "displayAvatarURL": "https://cdn.discordapp.com/avatars/213133244139307009/4e03a1462938815e7c24c01ace5d3da4.webp"
        },
        "name": "smacktodaface",
        "strength": "strong",
        "history": [ ],
        "nickname": null,
        "profession": "hunter",
        "worked": false,
        "consentList": [
          "notlink",
          "jmitcham"
        ],
        "inviteList": [
          "!save",
          "!pass"
        ]
      },
      "jmitcham": {
        "gender": "female",
        "food": 2,
        "grain": 0,
        "basket": 0,
        "spearhead": 0,
        "handle": {
          "id": "922949872108310598",
          "system": null,
          "locale": null,
          "flags": 0,
          "username": "jmitcham",
          "bot": false,
          "discriminator": "6095",
          "avatar": null,
          "lastMessageChannelID": null,
          "createdTimestamp": 1640118797090,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/0.png",
          "tag": "jmitcham#6095",
          "avatarURL": null,
          "displayAvatarURL": "https://cdn.discordapp.com/embed/avatars/0.png"
        },
        "name": "jmitcham",
        "history": [
         ],
        "profession": "crafter",
        "canCraft": true,
        "worked": true,
        "nickname": null,
        "nursing": [
          "North"
        ],
        "inviteList": [
          "!save",
          "!pass"
        ],
        "activity": "craft"
      },
      "dougbeal": {
        "gender": "female",
        "food": 0,
        "grain": 0,
        "basket": 1,
        "spearhead": 0,
        "handle": {
          "id": "315239123420184587",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "dougbeal",
          "bot": false,
          "discriminator": "1725",
          "avatar": "17d2ed45a8d658b9faffd72b4ff87393",
          "lastMessageChannelID": null,
          "createdTimestamp": 1495229263883,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/0.png",
          "tag": "dougbeal#1725",
          "avatarURL": "https://cdn.discordapp.com/avatars/315239123420184587/17d2ed45a8d658b9faffd72b4ff87393.webp",
          "displayAvatarURL": "https://cdn.discordapp.com/avatars/315239123420184587/17d2ed45a8d658b9faffd72b4ff87393.webp"
        },
        "name": "dougbeal",
        "strength": "strong",
        "history": [],
        "profession": "gatherer",
        "nickname": null,
        "worked": true,
        "consentList": [
          "BethMitcham",
          "kevinmitcham"
        ],
        "guarding": [],
        "nursing": [
          "Olive"
        ],
        "isPregnant": "Question",
        "inviteList": [
          "!save",
          "BethMitcham",
          "!pass"
        ],
        "activity": "gather"
      },
      "Question": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "age": -1,
        "food": 2,
        "gender": "male",
        "name": "Question",
        "guardians": {}
      },
      "Cap": {
        "gender": "m",
        "golem": true,
        "food": 0,
        "grain": 0,
        "basket": 0,
        "spearhead": 0,
        "profession": "gatherer",
        "obeyList": [
          "hunt",
          "gather",
          "give",
          "guard",
          "ignore",
          "feed",
          "babysit"
        ],
        "name": "Cap",
        "worked": false,
        "history": [

        ],
        "guarding": [],
        "activity": "gather"
      }
    }
  }
        endLib.endGame(endGameState);
    actualMessage = endGameState.messages["tribe"]
    expect(actualMessage).toContain("The fate of the children")
    expect(actualMessage).toContain("The tribe was")
 })

 test("run scoreChildren", ()=>{
  let endGameState = {
    "seasonCounter": 37,
    "gameTrack": {
      "veldt": 1,
      "forest": 2,
      "marsh": 3,
      "hills": 1
    },
    "conceptionCounter": 18,
    "population": {
      "BethMitcham": {
        "gender": "male",
        "name": "BethMitcham"
      },
      "notlink": {
        "gender": "female",
        "name": "notlink"
      },
      "jmitcham": {
        "gender": "female",
        "name": "notlink"
      },
      "Thor": {
        "gender": "m",
        "golem": true,
        "name": "Thor"
      } ,          
      "kevinmitcham": {
        "gender": "m",
        "name": "kevinmitcham",
        "activity": "hunt"
      }
    },
    "graveyard": {
      "Gray": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 3,
        "food": 0,
        "gender": "male",
        "name": "Gray",
        "deathMessage": "alligator attack",
        "deathSeason": 22
      },
      "Iron": {
        "gender": "m",
        "golem": true,
        "profession": "gatherer",
        "deathMessage": "starvation",
        "deathSeason": 26
      }
    },
    "children": {
      "f1": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 29
      },
      "f2": {
        "mother": "notlink",
        "father": "BethMitcham",
        "newAdult": true
      },
      "f3": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 25,
        "newAdult": true,
        "babysitting": "Ilex"
      },
      "f4": {
        "mother": "jmitcham",
        "father": "BethMitcham",
        "age": 21
      },
      "f5": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 19
      },
      "F6": {
        "mother": "jmitcham",
        "father": "BethMitcham",
        "age": 18
      },
      "f7": {
        "mother": "jmitcham",
        "father": "BethMitcham",
        "age": 18
      },
      "Ilex8": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "age": 16,
        "gender": "male",
        "name": "Ilex"
      },
      "Jewel9": {
        "mother": "jmitcham",
        "father": "kevinmitcham",
        "age": 13,
        "name": "Jewel"
      },
      "Kental10": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 12
      },
      "Laurel11": {
        "mother": "notlink",
        "father": "kevinmitcham",
        "age": 9,
        "name": "Laurel"
      },
      "Meadow12": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "name": "Meadow"
      },
      "North13": {
        "mother": "jmitcham",
        "father": "kevinmitcham",
        "gender": "female",
        "name": "North"
      },
      "Olive14": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "gender": "female",
        "name": "Olive",
        "guardians": {}
      },
      "Pine15": {
        "mother": "notlink",
        "father": "BethMitcham",
        "gender": "female",
        "name": "Pine"
      },
      "Redhair16": {
        "mother": "notlink",
        "father": "BethMitcham",
        "gender": "male",
        "name": "Redhair"
      }
    },
    "currentLocationName": "marsh",
    "round": "work",
    "workRound": true,
    "foodRound": false,
    "reproductionRound": false,
    "doneMating": false,
    "banished": {
      "ginny": {
        "gender": "male",
        "food": 2,
        "grain": 4,
        "basket": 0,
        "spearhead": 0,
        "name": "ginny",
        "strength": "weak",
        "nickname": null
      },
      "Cas_Mulford": {
        "gender": "male",
        "name": "Cas_Mulford",
        "history": [
          "7: Joined the tribe",
          "7: BethMitcham gave you 1 basket",
          "7: Cas_Mulford gathers [7]-season clams (4) basket: [7]clams (4) basket breaks.",
          "7: jmitcham gave you 1 basket",
          "7.5: Cas_Mulford gathers [16]grain (6) basket: [7]clams (4)",
          "8: Cas_Mulford gathers [12]-season mushrooms (6) basket: [5]clams (4) basket breaks.",
          "8.5: jmitcham gave you 1 basket",
          "8.5: Cas_Mulford gathers [7]clams (4) basket: [11]turtle eggs (7)",
          "9: Cas_Mulford gathers [14]-season turtle eggs (7) basket: [3]clams (4)",
          "9.5: Cas_Mulford gathers [10]duck eggs (7) basket: [11]turtle eggs (7)",
          "10: Cas_Mulford gathers [10]-season clams (4) basket: [8]clams (4)",
          "10.5: Cas_Mulford gathers [10]duck eggs (7) basket: [5]clams (4)",
          "11.5: Cas_Mulford gathers [10]duck eggs (7) basket: [5]clams (4)"
        ],
        "profession": "gatherer"
      },
      "smacktodaface": {
        "gender": "male",
        "name": "smacktodaface",
        "strength": "strong",
        "inviteList": [
          "!save",
          "!pass"
        ]
      }
    }
  }
    scoreMessage = endLib.scoreChildrenMessage(endGameState)
    expect(scoreMessage).toContain("BethMitcham(m): 13")
});

test("run scoreChildren simple", ()=>{
  let endGameState = {
    "population": {
      "BethMitcham": {
        "gender": "male",
        "name": "BethMitcham",
      },
      "notlink": {
        "gender": "female",
      },
      "otherMale": {
        "gender": "male"
      },
      "otherFemale":{
        "gender":"female"
      }
    },
    "graveyard": {
      "Gray": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 3,
        "food": 0,
        "gender": "male",
        "name": "Gray",
        "guardians": {
          "notlink": 2
        },
        "deathMessage": "alligator attack",
        "deathSeason": 22
      }
    },
    "children": {
      "Akkz": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 29,
        "food": 2,
        "gender": "male",
        "name": "Akkz",
        "newAdult": true
      },
      "otherChild": {
        "mother": "otherFemale",
        "father": "otherMale",
        "gender": "male",
        "name": "otherChild",
        "newAdult": true
      },
      "Bison": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 27,
        "food": 2,
        "gender": "male",
        "name": "Bison",
        "guardians": {},
        "babysitting": "Jewel",
        "newAdult": true
      },
      "Cat": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 25,
        "food": 2,
        "gender": "female",
        "name": "Cat",
        "guardians": {
          "BethMitcham": 2
        },
        "newAdult": true,
        "babysitting": "Ilex"
      }
    },
    "banished": {
      "ginny": {
        "gender": "male",
        "food": 2,
        "grain": 4,
        "basket": 0,
        "spearhead": 0,
        "handle": {
          "id": "781377010244649022",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "ginny",
          "bot": false,
          "discriminator": "4104",
          "avatar": null,
          "lastMessageChannelID": null,
          "createdTimestamp": 1606365196525,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/4.png",
          "tag": "ginny#4104",
          "avatarURL": null,
          "displayAvatarURL": "https://cdn.discordapp.com/embed/avatars/4.png"
        },
        "name": "ginny",
        "strength": "weak",
        "history": [
          "10: Joined the tribe",
          "10: ginny crafts[3] a basket",
          "10.5: ginny crafts[3] a basket",
          "11: You gave CAP  2 basket"
        ],
        "profession": "crafter",
        "canCraft": true,
        "worked": false,
        "nickname": null
      },
      "Cas_Mulford": {
        "gender": "male",
        "food": 25,
        "grain": 10,
        "basket": 1,
        "spearhead": 0,
        "handle": {
          "id": "694698143211847700",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "Cas_Mulford",
          "bot": false,
          "discriminator": "5858",
          "avatar": null,
          "lastMessageChannelID": null,
          "createdTimestamp": 1585699344209,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png",
          "tag": "Cas_Mulford#5858",
          "avatarURL": null,
          "displayAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png"
        },
        "name": "Cas_Mulford",
        "history": [
          "7: Joined the tribe",
          "7: BethMitcham gave you 1 basket",
          "7: Cas_Mulford gathers [7]-season clams (4) basket: [7]clams (4) basket breaks.",
          "7: jmitcham gave you 1 basket",
          "7.5: Cas_Mulford gathers [16]grain (6) basket: [7]clams (4)",
          "8: Cas_Mulford gathers [12]-season mushrooms (6) basket: [5]clams (4) basket breaks.",
          "8.5: jmitcham gave you 1 basket",
          "8.5: Cas_Mulford gathers [7]clams (4) basket: [11]turtle eggs (7)",
          "9: Cas_Mulford gathers [14]-season turtle eggs (7) basket: [3]clams (4)",
          "9.5: Cas_Mulford gathers [10]duck eggs (7) basket: [11]turtle eggs (7)",
          "10: Cas_Mulford gathers [10]-season clams (4) basket: [8]clams (4)",
          "10.5: Cas_Mulford gathers [10]duck eggs (7) basket: [5]clams (4)",
          "11.5: Cas_Mulford gathers [10]duck eggs (7) basket: [5]clams (4)"
        ],
        "profession": "gatherer",
        "worked": false,
        "nickname": null,
        "guarding": [],
        "inviteList": [
          "!save",
          "!pass"
        ]
      },
      "kevinmitcham": {
        "gender": "male",
        "food": 0,
        "grain": 4,
        "basket": 0,
        "spearhead": 0,
        "handle": {
          "id": "427681770930962435",
          "system": null,
          "locale": null,
          "flags": 0,
          "username": "kevinmitcham",
          "bot": false,
          "discriminator": "9587",
          "avatar": "590d429490ae1be623d1fe906fecdcbc",
          "lastMessageChannelID": null,
          "createdTimestamp": 1522037680133,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/2.png",
          "tag": "kevinmitcham#9587",
          "avatarURL": "https://cdn.discordapp.com/avatars/427681770930962435/590d429490ae1be623d1fe906fecdcbc.webp",
          "displayAvatarURL": "https://cdn.discordapp.com/avatars/427681770930962435/590d429490ae1be623d1fe906fecdcbc.webp"
        },
        "name": "kevinmitcham",
        "history": [
        ],
        "profession": "hunter",
        "worked": true,
        "nickname": null,
        "consentList": [
          "jmitcham",
          "notlink",
          "dougbeal"
        ],
        "inviteList": [
          "notlink",
          "jmitcham",
          "dougbeal",
          "!save",
          "!pass"
        ],
        "activity": "hunt"
      },
      "smacktodaface": {
        "gender": "male",
        "food": 0,
        "grain": 4,
        "basket": 1,
        "spearhead": 1,
        "handle": {
          "id": "213133244139307009",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "smacktodaface",
          "bot": false,
          "discriminator": "5808",
          "avatar": "4e03a1462938815e7c24c01ace5d3da4",
          "lastMessageChannelID": null,
          "createdTimestamp": 1470885325227,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/3.png",
          "tag": "smacktodaface#5808",
          "avatarURL": "https://cdn.discordapp.com/avatars/213133244139307009/4e03a1462938815e7c24c01ace5d3da4.webp",
          "displayAvatarURL": "https://cdn.discordapp.com/avatars/213133244139307009/4e03a1462938815e7c24c01ace5d3da4.webp"
        },
        "name": "smacktodaface",
        "strength": "strong",
        "history": [ ],
        "nickname": null,
        "profession": "hunter",
        "worked": false,
        "consentList": [
          "notlink",
          "jmitcham"
        ],
        "inviteList": [
          "!save",
          "!pass"
        ]
      },
      "jmitcham": {
        "gender": "female",
        "food": 2,
        "grain": 0,
        "basket": 0,
        "spearhead": 0,
        "handle": {
          "id": "922949872108310598",
          "system": null,
          "locale": null,
          "flags": 0,
          "username": "jmitcham",
          "bot": false,
          "discriminator": "6095",
          "avatar": null,
          "lastMessageChannelID": null,
          "createdTimestamp": 1640118797090,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/0.png",
          "tag": "jmitcham#6095",
          "avatarURL": null,
          "displayAvatarURL": "https://cdn.discordapp.com/embed/avatars/0.png"
        },
        "name": "jmitcham",
        "history": [
         ],
        "profession": "crafter",
        "canCraft": true,
        "worked": true,
        "nickname": null,
        "nursing": [
          "North"
        ],
        "inviteList": [
          "!save",
          "!pass"
        ],
        "activity": "craft"
      },
      "dougbeal": {
        "gender": "female",
        "food": 0,
        "grain": 0,
        "basket": 1,
        "spearhead": 0,
        "handle": {
          "id": "315239123420184587",
          "system": false,
          "locale": null,
          "flags": 0,
          "username": "dougbeal",
          "bot": false,
          "discriminator": "1725",
          "avatar": "17d2ed45a8d658b9faffd72b4ff87393",
          "lastMessageChannelID": null,
          "createdTimestamp": 1495229263883,
          "defaultAvatarURL": "https://cdn.discordapp.com/embed/avatars/0.png",
          "tag": "dougbeal#1725",
          "avatarURL": "https://cdn.discordapp.com/avatars/315239123420184587/17d2ed45a8d658b9faffd72b4ff87393.webp",
          "displayAvatarURL": "https://cdn.discordapp.com/avatars/315239123420184587/17d2ed45a8d658b9faffd72b4ff87393.webp"
        },
        "name": "dougbeal",
        "strength": "strong",
        "history": [],
        "profession": "gatherer",
        "nickname": null,
        "worked": true,
        "consentList": [
          "BethMitcham",
          "kevinmitcham"
        ],
        "guarding": [],
        "nursing": [
          "Olive"
        ],
        "isPregnant": "Question",
        "inviteList": [
          "!save",
          "BethMitcham",
          "!pass"
        ],
        "activity": "gather"
      },
      "Question": {
        "mother": "dougbeal",
        "father": "BethMitcham",
        "age": -1,
        "food": 2,
        "gender": "male",
        "name": "Question",
        "guardians": {}
      },
      "Cap": {
        "gender": "m",
        "golem": true,
        "food": 0,
        "grain": 0,
        "basket": 0,
        "spearhead": 0,
        "profession": "gatherer",
        "obeyList": [
          "hunt",
          "gather",
          "give",
          "guard",
          "ignore",
          "feed",
          "babysit"
        ],
        "name": "Cap",
        "worked": false,
        "history": [

        ],
        "guarding": [],
        "activity": "gather"
      }
    }
  }
  scoreMessage = endLib.scoreChildrenMessage(endGameState)
  expect(scoreMessage).toContain("BethMitcham(m): 3")
  expect(scoreMessage).toContain("notlink(f): 3")
  expect(scoreMessage).toContain("otherFemale(f): 1")
});

test("run scoreChildren trivial", ()=>{
  let endGameState = {
    "population": {
      "BethMitcham": {
        "gender": "male",
        "name": "BethMitcham",
      },
      "notlink": {
        "gender": "female",
      },
    },
    "graveyard": {
    },
    "children": {
      "Akkz": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 29,
        "food": 2,
        "gender": "male",
        "name": "Akkz",
        "guardians": {},
        "babysitting": "Dani",
        "newAdult": true
      },
      "Bison": {
        "mother": "notlink",
        "father": "BethMitcham",
        "age": 27,
        "food": 2,
        "gender": "male",
        "name": "Bison",
        "guardians": {},
        "babysitting": "Jewel",
        "newAdult": true
        }
      },
    "banished": {
    }
  }
  scoreMessage = endLib.scoreChildrenMessage(endGameState)
  expect(scoreMessage).toContain("BethMitcham(m): 2")
});
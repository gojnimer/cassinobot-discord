const Discord = require('discord.js-selfbot');
const { prefix, token } = require('./config/config.json');
const _ = require('lodash');
const mysql = require("mysql");


var mudaeID = /* "551329384783544321"  */"585401301731377163";
const client = new Discord.Client();
const dbconfig = {
    host: "us-cdbr-east-02.cleardb.com",
    user: "bf65510696edb1",
    password: "8b9ccdc7",
    database: "heroku_5780939d7c6566a",
    debug: 'false'
};

var conn;

function handleDisconnect() {
    conn = mysql.createConnection(dbconfig); // Recreate the connection, since
    // the old one cannot be reused.

    conn.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    conn.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

const startDB = () => {
    return new Promise(function (resolve, reject) {
        conn.connect();
        pool.createConnection(dbconfig).then(function (connection) {
            resolve(connection);
        }).catch(function (error) {
            reject(error);
        }).finally(() => { });
    });
}


const executeQuery = async (q) => {
    return new Promise(function (resolve, reject) {
        conn.query(q, function (error, connection) {
            if (error) {
                reject(error);
            } else {
                resolve(connection);
            }

        })
    });

}


const checkLogin = async (idDisc) => {
    return new Promise(async function (resolve, reject) {
        let e = await executeQuery(`SELECT EXISTS(SELECT * FROM USERS WHERE id_discord = "${idDisc}") as id`).catch(e => { reject('erro durante a consulta'); });
        let ret = e.parseSqlResult();
        resolve(ret.id);
    });

}

let guildRoulettes = [];

const newRoulette = (guildID, dealerID, currentRouletteID) => {
    guildRoulettes.push({
        guildID: guildID,
        dealerID: dealerID,
        roulettePlayers: [],
        currentRouletteID: currentRouletteID
    })
}

const resetRoulette = (a) => {

    _.remove(guildRoulettes, function (e) {
        return e.guildID == a;
    });

}

var rand = function () {
    return Math.random().toString(36).substr(2); // remove `0.`
};

var Gtoken = function () {
    return rand() + rand(); // to make it longer
};

Object.prototype.parseSqlResult = function () {
    return JSON.parse(JSON.stringify(this[0]))
}

const answers = {
    positive: ['s', 'sim', 'y', 'yes'],
    negative: ['n', 'não', 'no']
}



const formatID = (id) => {
    return `<@${id}>`;
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (msg) => {


    /* 
        let rouletteConfig = guildRoulettes.find(e => e.guildID == msg.guild.id); */

    /* if (msg.content === `${prefix}register`) {

        let pool = startDB();

        pool.connect();
        // create a new query
        pool.query(`SELECT EXISTS(SELECT * FROM USERS WHERE id_discord = "${msg.author.id}") as id`, function (err, result) {
            let ret = [];
            if (err) {
                msg.reply("ocorreu um erro durante o registro, tente novamente");
                pool.end();
                return;
            }
            ret = result.parseSqlResult();
            console.log(ret.id);
            if (ret.id == 0) {
                var query = `INSERT INTO USERS VALUES(null, "${msg.author.id}", "${msg.author.username}", "${msg.author.discriminator}", 0)`;
                pool.query(query, (a, b, c) => {
                    console.log(b);
                    msg.reply('você foi registrado com sucesso!');
                });
            } else {
                msg.reply('você já é registrado');

            }
            pool.end();
        });
        return;
    } */






    //EASTER EGGS
    if (msg.content.toLowerCase() === "atchim") {
        msg.reply('santinho');
        return;
    }
    if (msg.content.toLowerCase() === "bordão do ovelha") {
        msg.channel.send('BOLTZ >:');
        return;
    }
    if (msg.content.toLowerCase() === "puts") {
        msg.channel.send('vai dar não');
        return;
    }
    console.log(msg);

    //COMANDOS NORMAIS
    let message = msg.content.toLowerCase().split(' ');
    console.log(message);


    if (message[0].toLowerCase() === `${prefix}bet` || message[0] === `${prefix}b`) {
        let check = await checkLogin(msg.author.id);
        if (check == 0) {
            msg.reply(`você ainda não se cadastrou, digite ${prefix}register`);
            return;
        }
        let roulette = await executeQuery(`SELECT * FROM ROULETTE WHERE id_guild = '${msg.guild.id}' AND active = true`);
        if (roulette.length == 0) {
            msg.reply(`não existe roleta ativa no momento, digite ${prefix}roulette para iniciar uma nova roleta.`)
            return;
        }

        roulette = roulette.parseSqlResult();
        let betU = await executeQuery(`SELECT * FROM ROULETTE_PLAYERS WHERE id_roulette = '${roulette.id_roulette}' AND id_discord = '${msg.author.id}'`);
        if (message.length != 2) {
            if (message.length == 1) {
                if (betU.length > 0) {
                    let value = await executeQuery(`SELECT bet_amount FROM ROULETTE_PLAYERS WHERE id_discord = "${msg.author.id}" AND id_roulette = '${roulette.id_roulette}'`)
                    value = value.parseSqlResult();
                    msg.reply(`você apostou **${value.bet_amount}** nessa roleta.`);
                    return;
                } else {
                    msg.reply('você não apostou nada na roleta atual.');
                    return;
                }

            } else {

                msg.reply('Não entendi, use &bet <valor>');
                return;
            }

        }
        if (isNaN(message[1])) { msg.reply('por favor digite um número válido!'); return; };
        if(parseInt(message[1]) < roulette.min_bet && parseInt(message[1]) != 0 ) { msg.reply(`a aposta mínima nessa roleta é de **${roulette.min_bet}** kakeras.`); return; };
        if (betU.length == 0) {
            let query = await executeQuery(`SELECT balance FROM USERS WHERE id_discord = ${msg.author.id}`).catch(e => { msg.reply("ocorreu um erro, tente novamente"); return; });
            let userb = query.parseSqlResult();
            if (userb.balance >= parseInt(message[1])) {

                let increaseRoulette = `
                UPDATE
                USERS,
                (SELECT * FROM USERS WHERE id_discord = '${msg.author.id}') AS source
                ,
                ROULETTE AS dest,
                (
                    SELECT
                            *
                        FROM
                        ROULETTE
                        WHERE
                            id_roulette = "${roulette.id_roulette}"
                    ) AS src
                SET
                    dest.quantity_participants = src.quantity_participants + 1,
                    USERS.balance = source.balance - ${parseInt(message[1])},
                    dest.prize = src.prize + ${parseInt(message[1])}

                WHERE
                    dest.id_roulette = "${roulette.id_roulette}" AND
                    USERS.id_discord = ${msg.author.id}
                ;`
                await executeQuery(increaseRoulette);
                let iQuery = `
                INSERT INTO ROULETTE_PLAYERS VALUES (null,'${msg.author.id}','${roulette.id_roulette}','${message[1]}')
            `
                await executeQuery(iQuery);
                msg.reply('aposta efetuada com sucesso');

                return;
            } else {
                msg.reply('saldo insuficiente');
                return
            }

        } else {
            let bal = await executeQuery(`SELECT balance,bet_amount FROM USERS,roulette_players WHERE USERS.id_discord = '${msg.author.id}' AND roulette_players.id_discord = '${msg.author.id}' AND roulette_players.id_roulette = '${roulette.id_roulette}'`);
            bal = bal.parseSqlResult();
            if (bal.balance + bal.bet_amount >= parseInt(message[1])) {
                betU = betU.parseSqlResult();
                let up = `
                UPDATE
                USERS AS dest,
                (SELECT * FROM USERS WHERE id_discord = "${msg.author.id}") AS src,
                ROULETTE_PLAYERS AS rp,
                ROULETTE AS rt
                SET
                    dest.balance = src.balance + ${parseInt(bal.bet_amount)},
                    rp.bet_amount = 0,
                    rt.prize = ${parseInt(roulette.prize)} - ${parseInt(bal.bet_amount)}
                WHERE
                    dest.id_discord = "${msg.author.id}" AND
                    rp.id_discord = "${msg.author.id}" AND
                    rp.id_roulette = "${roulette.id_roulette}" AND
                    rt.id_roulette = "${roulette.id_roulette}"

                ;`
                await executeQuery(up);

                if (parseInt(message[1]) == 0) {

                    let decreaseRoulette = `
                    UPDATE
                    ROULETTE AS dest,
                    (SELECT * FROM ROULETTE_PLAYERS WHERE id_roulette = '${roulette.id_roulette}' AND id_discord = '${msg.author.id}') AS rsrc,
                    (SELECT * FROM ROULETTE WHERE id_roulette = "${roulette.id_roulette}" ) AS src
                                
                            
                            
                           
                                
                        
                    SET
                        dest.quantity_participants = src.quantity_participants - 1,
                        dest.prize = src.prize - rsrc.bet_amount

                    WHERE
                        dest.id_roulette = "${roulette.id_roulette}"
                    ;`
                    await executeQuery(decreaseRoulette);
                    await executeQuery(`DELETE FROM ROULETTE_PLAYERS WHERE id_discord = '${msg.author.id}' AND id_roulette = '${roulette.id_roulette}'`);
                    msg.reply('você retirou a sua aposta com sucesso');
                    return;
                }

                await executeQuery(`UPDATE ROULETTE as rt,(SELECT * FROM ROULETTE WHERE id_roulette = '${roulette.id_roulette}') as rtt,ROULETTE_PLAYERS AS rp,USERS,(SELECT * FROM USERS WHERE id_discord = "${msg.author.id}") as src SET rt.prize = rtt.prize + ${parseInt(message[1])}, rp.bet_amount = ${parseInt(message[1])}, USERS.balance = src.balance - ${parseInt(message[1])} WHERE USERS.id_discord = '${msg.author.id}' AND rt.id_roulette = '${roulette.id_roulette}' AND rp.id_discord = '${msg.author.id}' AND rp.id_roulette = '${roulette.id_roulette}'`);

                msg.reply(`você atualizou sua aposta para **${message[1]}** kakeras`);
                return;
            } else {
                msg.reply('você não tem saldo suficiente');
                return;
            }


        }

    }






    if (message[0] === `${prefix}roulette` || message[0] === `${prefix}r`) {
        let minBet = 0;
        let check = await checkLogin(msg.author.id).catch((e) => { msg.reply(e); return; });
        if (check == 0) {
            msg.reply(`você ainda não se cadastrou, digite ${prefix}register`);
            return;
        }
        if(message.length > 2){
            msg.reply(`não entendi, use ${prefix}roulette <aposta mínima entre 1-2000 (opcional)>`);
            return;
        } 
        if(message.length == 2){
            if(isNaN(message[1])){
                msg.reply(`não entendi, use ${prefix}roulette <aposta mínima entre 1-2000 (opcional)>`);
                return;
            }
            let v = parseInt(message[1]);
            if(v > 2000){
                msg.reply(`o valor da aposta mínima não pode ultrapassar 2000`);
                return;
            }

            minBet = v;
        }

        try {
            let roulette = await executeQuery(`SELECT id_roulette FROM ROULETTE WHERE id_guild = '${msg.guild.id}' AND active = true`);
            console.log(roulette);
            if (roulette.length == 0) {
                await executeQuery(`INSERT INTO ROULETTE VALUES (null,'${msg.guild.id}','${msg.author.id}','${Gtoken()}',0,0,'none',true,${minBet});`);
                msg.reply('roleta iniciada');
                return;
            } else {
                msg.reply(`já existe uma roulette ativa nesse servidor, digite ${prefix}bet para jogar`);
                return;
            }
        } catch{
            msg.reply('ocorreu um erro, por favor tente novamente.')
        }

    }

    if (message[0] === `${prefix}retrieve`) {
        if (message.length != 2) {
            msg.reply(`Não entendi, use ${prefix}retrieve <valor>`);
            return;
        }
        let check = await checkLogin(msg.author.id).catch((e) => { msg.reply(e); return; });
        if (check == 0) {
            msg.reply(`você ainda não se cadastrou, digite ${prefix}register`);
            return;
        }
        let query = await executeQuery(`SELECT balance FROM USERS WHERE id_discord = ${msg.author.id}`).catch(e => { msg.reply("ocorreu um erro, tente novamente"); return; });
        let userb = query.parseSqlResult();
        if (isNaN(message[1])) { msg.reply('por favor digite um número válido!'); return; }
        if (userb.balance >= parseInt(message[1])) {
            let query = `
            UPDATE
            USERS AS dest,
            (
                SELECT
                        *
                    FROM
                        USERS
                    WHERE
                        id_discord = "${msg.author.id}"
                ) AS src
            SET
                dest.balance = src.balance - ${parseInt(message[1])}
            WHERE
                dest.id_discord = "${msg.author.id}"
            ;`
            /* await executeQuery(query).catch(e => { console.log(e); return; }); */
            setTimeout(() => {
                msg.channel.send(`$givek ${formatID(msg.author.id)} ${message[1]}`).then(() => {
                    let filter = a => a.author.id == mudaeID && a.content.startsWith('**cassinobot');
                    let waiting = false;
                    setTimeout(() => {
                        if (!waiting) {
                            msg.channel.send('y');
                        }
                    }, 5000)
                    msg.channel.awaitMessages(filter, { max: 1, time: 15000, errors: ['ocorreu um erro, fale com um administrador'] }).then(
                        async () => {
                            let filter = a => a.author.id == mudaeID && a.content.startsWith("<@!737168830912004198> deu");
                            msg.channel.send('y')
                            await executeQuery(query).catch(e => { console.log(e); return; });
                            msg.reply('kakera devolvida com sucesso!, caso não tenha recebido fale com um administrador.')
                            waiting = true;

                            /*   .awaitMessages(filter,{ max: 1, time: 5000, errors: ['ocorreu um erro, fale com um administrador'] }).then(async ()=>{
                                  
                                
                              }); */


                        }
                    )
                })
            }, 500)

            return;
        } else {
            msg.reply('saldo insuficiente');
            return
        }
    }


    if (message[0] === `${prefix}cassinohelp`) {
        /* msg.channel.send('teste'); */
        const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Some title')
            .setURL('https://discord.js.org/')
            .setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
            .setDescription('Some description here')
            .setThumbnail('https://i.imgur.com/wSTFkRM.png')
            .addFields(
                { name: 'Regular field title', value: 'Some value here' },
                { name: '\u200B', value: '\u200B' },
                { name: 'Inline field title', value: 'Some value here', inline: true },
                { name: 'Inline field title', value: 'Some value here', inline: true },
            )
            .addField('Inline field title', 'Some value here', true)
            .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
            .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');

        msg.channel.send(exampleEmbed);
    }

    if (message[0] === `${prefix}register`) {
        let check = await checkLogin(msg.author.id).catch((e) => { msg.reply(e); return; });
        if (check == 0) {
            var query = `INSERT INTO USERS VALUES(null, "${msg.author.id}", "${msg.author.username}", "${msg.author.discriminator}", 0)`;
            await executeQuery(query).catch(e => msg.reply("ocorreu um erro durante o registro, tente novamente"));
            msg.reply('você foi registrado com sucesso!');


        } else {
            msg.reply('você já é registrado');

        }
        ;
        return;
    }

    if (message[0] === `${prefix}balance` && message.length == 1) {
        let e = await executeQuery(`SELECT EXISTS(SELECT * FROM USERS WHERE id_discord = "${msg.author.id}") as id`).catch(e => { msg.reply("ocorreu um erro, tente novamente"); return; });
        let ret = e.parseSqlResult();
        if (ret.id == 0) {
            msg.reply(`você ainda não se cadastrou, digite ${prefix}register`);
            return;
        }
        let a = await executeQuery(`SELECT balance FROM USERS WHERE id_discord = ${msg.author.id}`).catch(e => { msg.reply("ocorreu um erro, tente novamente"); return; });
        let ret2 = a.parseSqlResult();
        msg.reply(`você tem um saldo de **${ret2.balance}** kakeras.`);
        return;
    }





    if (message.length == 4) {
        if (message[3] == '<@737168830912004198>' && msg.author.id === mudaeID) {
            try {
                let value = message[2].split('**');
                let userID = message[0].replace('<', '').replace('>', '').replace('@', '').replace('!', '');
                let e = await executeQuery(`SELECT EXISTS(SELECT * FROM USERS WHERE id_discord = "${userID}") as id`).catch(e => console.log(e));
                let ret = e.parseSqlResult();
                console.log('teessteee', ret);
                if (ret.id === 0) {
                    msg.channel.send(`${message[0]}, se registre usando ${prefix}register antes de fazer um deposito.`);
                    throw 'Error';
                } else {
                    let query = `
                    UPDATE
                    USERS AS dest,
                    (
                        SELECT
                                *
                            FROM
                                USERS
                            WHERE
                                id_discord = "${userID}"
                        ) AS src
                    SET
                        dest.balance = src.balance + ${parseInt(value[1])}
                    WHERE
                        dest.id_discord = "${userID}"
                    ;`
                    await executeQuery(query).catch(e => { console.log(e); return; });
                    msg.channel.send(`${message[0]} depositou ${value[1]} kakeras`);
                }
                ;
                return;

            } catch (error) {
                console.log(error);
                let value = message[2].split('**');
                if (error != 'Error') {
                    msg.channel.send(`${message[0]}, ocorreu um erro, verifique se você é registrado usando ${prefix}register`);
                }
                setTimeout(()=>{
                    msg.channel.send(`$givek ${message[0]} ${value[1]}`).then(() => {
                        let filter = a => a.author.id == mudaeID && a.content.startsWith('**cassinobot');
                        let waiting = false;
                        setTimeout(() => {
                            if (!waiting) {
                                msg.channel.send('y');
                            }
                        }, 5000)
                        msg.channel.awaitMessages(filter, { max: 1, time: 15000, errors: ['ocorreu um erro, fale com um administrador'] }).then(async () => {
                            let filter = a => a.author.id == mudaeID && msg.content.startsWith("<@!737168830912004198> deu");
                            msg.channel.send('y')
                            await executeQuery(query).catch(e => { console.log(e); return; });
                            msg.reply('kakera devolvida com sucesso!, fale com um administrador caso não tenha recebido');
                            /* .awaitMessages(filter,{ max: 1, time: 5000, errors: ['ocorreu um erro, fale com um administrador'] }).then(async ()=>{
                               
                            }); */
                            waiting = true;
                        }
                        )
                    })
                },500)
               
            }
        }
    }

    if (message[0] === `${prefix}botbalance`) setTimeout(() => { msg.channel.send("$k") }, 500);

    /*  if (message[0] === `${prefix}ask`) {
         let r = ['talvez', 'sim', 'não', 'sim', 'não', 'sim', 'não', 'sim', 'não', 'sim', 'não', 'sim', 'não', 'sim', 'não', 'sim', 'não', 'sim', 'não'];
         msg.reply(_.sample(r));
     } */




    if (message[0].toLowerCase() === `${prefix}players` || message[0] === `${prefix}ps`) {
        let check = await checkLogin(msg.author.id);
        if (check == 0) {
            msg.reply(`você ainda não se cadastrou, digite ${prefix}register`);
            return;
        }
        let roulette = await executeQuery(`SELECT * FROM ROULETTE WHERE id_guild = '${msg.guild.id}' AND active = true`);
        if (roulette.length == 0) {
            msg.reply(`não existe roleta ativa no momento, digite ${prefix}roulette para iniciar uma nova roleta.`)
            return;
        }
          /* const embed = new Discord.MessageEmbed().setTitle("LISTA DE PARTICIPANTES").setColor('#0099ff').setImage('https://media.giphy.com/media/3o6ZthJkc3ZuvBOSGs/giphy.gif'); */
        roulette = roulette.parseSqlResult();
        let roulettePlayers = await executeQuery(`SELECT id_discord,bet_amount FROM ROULETTE_PLAYERS WHERE id_roulette = '${roulette.id_roulette}'`).catch(e => console.log(e));
        if (roulettePlayers.length > 0) {
            let players = [];
            roulettePlayers.forEach((e, i) => {

                players.push(`**${formatID(e.id_discord)}** apostou **${e.bet_amount}** kakeras`);
            })
          /*   embed.addFields(players) */
            msg.channel.send(`**JOGADORES ATIVOS NESSA ROLETA** \n ${players.join(' \n ')}\n\n\n **Total: ${roulette.prize} kakeras**`);
            return;
        } else {
            msg.reply('nenhum jogador apostou nessa roleta');
            return;
        }

    }

    if (msg.content.toLowerCase() === `${prefix}spin`) {

        let check = await checkLogin(msg.author.id);
        if (check == 0) {
            msg.reply(`você ainda não se cadastrou, digite ${prefix}register`);
            return;
        }
        let roulette = await executeQuery(`SELECT * FROM ROULETTE WHERE id_guild = '${msg.guild.id}' AND active = true`);
        if (roulette.length == 0) {
            msg.reply(`não existe roleta ativa no momento, digite ${prefix}roulette para iniciar uma nova roleta.`)
            return;
        }
        roulette = roulette.parseSqlResult();
        if (roulette.id_creator != msg.author.id) {
            msg.reply(`somente o dealer(${formatID(roulette.id_creator)}) pode usar esse comando.`);
            return;
        }
        let roulettePlayers = await executeQuery(`SELECT * FROM ROULETTE_PLAYERS WHERE id_roulette = '${roulette.id_roulette}'`);
        if (roulettePlayers.length != 0) {
            let roll = [];
            roulettePlayers.forEach((item, index) => {
                i = 0;
                while (i != item.bet_amount) {
                    roll.push(index);
                    i++;
                }
            })
            console.log(roll);
            let e = roulettePlayers[_.sample(roll)];
            console.log(e.bet_amount);
            await executeQuery(`UPDATE USERS, ROULETTE, (SELECT * FROM ROULETTE WHERE id_roulette = '${roulette.id_roulette}') AS rou,
             (SELECT * FROM USERS WHERE id_discord = '${e.id_discord}') AS src SET ROULETTE.active = 0, ROULETTE.winner = '${e.id_discord}',
              users.balance = src.balance + rou.prize WHERE users.id_discord = '${e.id_discord}' AND ROULETTE.id_roulette = '${roulette.id_roulette}'`).catch((e) => { console.log(e); msg.reply('ocorreu um erro') })
            msg.channel.send(`${formatID(e.id_discord)} é o vencedor.`)
        }

        /* if (!rouletteConfig) {
            msg.reply("não existe roleta ativa no momento, digite &roulette para iniciar uma nova roleta.")
            return;
        }
        if (rouletteConfig.dealerID !== msg.author.id) {
            msg.reply('somente o criador da roleta pode usar este comando.');
            return;
        }
        if (rouletteConfig.roulettePlayers.length < 4) {
            msg.reply('você precisa de no minimo 4 jogadores para girar a roleta.')
            return;
        }
        var winner = _.sample(rouletteConfig.roulettePlayers);
        const embed = new Discord.MessageEmbed().setImage("https://media.giphy.com/media/l2SqdHgGOsZa8eAdW/giphy.gif").setTitle("RODA RODA RODA RODA").setColor('#0099ff');
        msg.channel.send(embed);
        setTimeout((a) => {
            a.channel.send(`O grande vencedor é o ${formatID(winner.id)}!!!!`);
            a.channel.send(`${formatID(winner.id)}, fale com o/a ${formatID(rouletteConfig.dealerID)} para receber o seu premio.`);
            resetRoulette(a.guild.id);
            return;
        }, 3000, msg)
        return; */
    }

    /* if (message[0] === `${prefix}cancelroulette` || message[0] === `${prefix}cr`) {
        if (!rouletteConfig) {
            msg.reply(`não existe roleta ativa no momento, digite ${prefix}roulette para iniciar uma nova roleta.`)
            return;
        }
        if (rouletteConfig.dealerID !== msg.author.id) {
            msg.reply('somente o criador da roleta pode usar este comando.');
            return;
        }
        if (rouletteConfig.roulettePlayers.length >= 5) {
            msg.reply("essa roleta tem 5 ou mais participantes, você tem certeza que deseja cancelar? (s/n)").then(() => {
                const filtro = col => col.author.id == msg.author.id && [...answers.positive, ...answers.negative].some(res => res.toLowerCase() === col.content.toLowerCase());
                msg.channel.awaitMessages(filtro, { max: 1, time: 10000, errors: ['acabou o tempo.'] }).then(
                    collected => {
                        let r = collected.first().content;
                        if (answers.negative.some(x => x.toLowerCase() === r.toLowerCase())) {
                            msg.reply('que os jogos continuem. :)')
                            return;
                        }
                        resetRoulette(msg.guild.id);
                        msg.reply('a roleta foi cancelada, digite &roulette para criar uma nova.');
                        return;
                    }
                ).catch(collected => {

                    msg.reply('acabou o tempo.');
                    return;
                });
            })

            return;
        }

        resetRoulette(msg.guild.id);
        msg.channel.send(`A roleta de ${formatID(msg.author.id)} foi cancelada!`);
        return;

    } */


});

client.login(token)

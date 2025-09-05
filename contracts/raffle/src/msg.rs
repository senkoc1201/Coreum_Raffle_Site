    use cosmwasm_schema::{cw_serde, QueryResponses};
    use cosmwasm_std::{Addr, Coin, Timestamp};
    use cw721::Cw721ReceiveMsg;
    use cw20::Cw20ReceiveMsg;

    #[cw_serde]
    pub struct InstantiateMsg {
        pub admin: Option<String>,
        pub protocol_fee_bps: u16,
        pub bounty_amount: Option<Coin>,
        pub drand_pubkey: Option<String>,
    }

    #[cw_serde]
    pub enum ExecuteMsg {
        ReceiveNft(Cw721ReceiveMsg),
        Receive(Cw20ReceiveMsg),
        CreateRaffle {
            nft_contract: String,
            token_id: String,
            price: Coin,
            max_tickets: u64,
            start_time: Option<Timestamp>,
            end_time: Timestamp,
            revenue_address: Option<String>,
            payment_cw20: Option<String>,
        },
        BuyTickets {
            raffle_id: u64,
            count: u64,
        },
        EndRaffle {
            raffle_id: u64,
            // drand fields
            drand_round: u64,
            randomness: String,
            signature: String,
        },
        CancelRaffle { raffle_id: u64 },
        UpdateConfig { fee_bps: Option<u16>, bounty: Option<Coin>, drand_pubkey: Option<String>, drand_round_seconds: Option<u64> },
        WithdrawFees { to: String },
    }

    #[cw_serde]
    pub struct CreateRaffleNftMsg {
        pub price: Coin,
        pub max_tickets: u64,
        pub start_time: Option<Timestamp>,
        pub end_time: Timestamp,
        pub revenue_address: Option<String>,
        pub payment_cw20: Option<String>,
    }

    #[cw_serde]
    pub struct BuyTicketsCw20Msg {
        pub raffle_id: u64,
        pub count: u64,
    }

    #[cw_serde]
    #[derive(QueryResponses)]
    pub enum QueryMsg {
        #[returns(RaffleResponse)]
        Raffle { raffle_id: u64 },
        #[returns(RaffleListResponse)]
        Raffles { start_after: Option<String>, limit: Option<u32> },
        #[returns(ParticipantResponse)]
        Participant { raffle_id: u64, address: String },
        #[returns(ParticipantsResponse)]
        Participants { raffle_id: u64, start_after: Option<String>, limit: Option<u32> },
        #[returns(ConfigResponse)]
        Config {},
    }

    #[cw_serde]
    pub struct RaffleResponse {
        pub raffle: Option<RaffleView>,
    }

    #[cw_serde]
    pub struct RaffleListResponse {
        pub raffles: Vec<RaffleView>,
    }

    #[cw_serde]
    pub struct ParticipantResponse {
        pub raffle_id: u64,
        pub address: Addr,
        pub ticket_count: u32,
    }

    #[cw_serde]
    pub struct RaffleView {
        pub id: u64,
        pub creator: Addr,
        pub nft_contract: Addr,
        pub token_id: String,
        pub price: Coin,
        pub max_tickets: u64,
        pub total_sold: u64,
        pub start_time: Option<Timestamp>,
        pub end_time: Timestamp,
        pub status: String,
        pub winner: Option<Addr>,
    }

    #[cw_serde]
    pub struct ParticipantsResponse {
        pub raffle_id: u64,
        pub participants: Vec<(Addr, u64)>,
    }

    #[cw_serde]
    pub struct ConfigResponse {
        pub admin: Addr,
        pub protocol_fee_bps: u16,
        pub bounty_amount: Option<Coin>,
        pub drand_pubkey: Option<String>,
        pub drand_round_seconds: Option<u64>,
    }



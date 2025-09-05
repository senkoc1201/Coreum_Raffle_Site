use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Coin, Timestamp};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub admin: Addr,
    pub protocol_fee_bps: u16,
    pub bounty_amount: Option<Coin>,
    pub drand_pubkey: Option<String>,
    pub drand_round_seconds: Option<u64>,
}

#[cw_serde]
pub struct Raffle {
    pub id: u64,
    pub creator: Addr,
    pub nft_contract: Addr,
    pub token_id: String,
    pub price: Coin,
    pub max_tickets: u64,
    pub total_sold: u64,
    pub start_time: Option<Timestamp>,
    pub end_time: Timestamp,
    pub revenue_address: Addr,
    pub payment_cw20: Option<Addr>,
    pub status: RaffleStatus,
    pub winner: Option<Addr>,
}

#[cw_serde]
pub enum RaffleStatus {
    Active,
    Completed,
    Cancelled,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const NEXT_ID: Item<u64> = Item::new("next_id");
pub const RAFFLES: Map<u64, Raffle> = Map::new("raffles");

// Ticket index -> owner
pub const TICKETS: Map<(u64, u64), Addr> = Map::new("tickets");
// User ticket counts
pub const USER_TICKET_COUNT: Map<(u64, &Addr), u64> = Map::new("user_ticket_count");
// Used drand rounds to prevent replays
pub const USED_ROUNDS: Map<(u64, u64), bool> = Map::new("used_rounds");



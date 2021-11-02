import React from "react";
import { Tabs, Tab } from "../../Utility/Tabs";
import TradeItemBuy from "./TradeItemBuy";
import TradeItemSell from "./TradeItemSell";
import { Apis } from "bitsharesjs-ws";
import Translate from "react-translate-component";
import TradeSorterFilter from "./Utility/TradeSorterFilter";
import { ChainStore } from "bitsharesjs";
import AccountStore from "stores/AccountStore";
import { connect } from "alt-react";


//STYLES
import "../scss/cwdgateway-active.scss";
import "../scss/cwdgateway-popup.scss";

class ActiveAdsList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            buyAds: [],
            sellAds: [],
            currentAccount: this.props.currentAccount,
            valideAmount: false,
            intervalID: 0,
            isSorted: false,
            findAccount: "",
            searchstring: "",
            rateData: {}
        };

        this.sortByExRate = this.sortByExRate.bind(this);
        this.sortByRating = this.sortByRating.bind(this);
        this.filterBySearchValue = this.filterBySearchValue.bind(this);
        this.showAllTrades = this.showAllTrades.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            JSON.stringify(nextState.buyAds) !==
            JSON.stringify(this.state.buyAds) ||
            JSON.stringify(nextState.sellAds) !==
            JSON.stringify(this.state.sellAds) ||
            nextState.isSorted !== this.state.isSorted ||
            nextState.searchstring !== this.state.searchstring
        );
    }

    componentDidMount() {
        this.getRateData();

        this.setState({
            intervalID: setInterval(this.getRateData.bind(this), 5000)
        });
    }

    componentWillUnmount() {
        clearInterval(this.state.intervalID);
    }

    onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    getRateData() {
        let host = window.location.hostname;
        if (["127.0.0", "192.168"].includes(host.substring(0, 7))) {
            host = "backup.cwd.global"
        }

        let url = "https://" + host + "/static/gateway-stats.json";

        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.setState({
                    rateData: data
                });

                this.getAds();
            });
    }

    getAds() {
        let ratesFilter = this.state.rateData;
        let currentAccount = this.props.currentAccount;
        let gateways = [];

        Apis.instance()
            .db_api()
            .exec("get_p2p_adv", [currentAccount, 1])
            .then(tradesBuy => {
                // filter traders by inifinity status
                for (let trade in tradesBuy) {
                    gateways.push(tradesBuy[trade]['pa']["p2p_gateway"]);
                }
                let unique = gateways.filter(this.onlyUnique);

                Apis.instance()
                    .db_api()
                    .exec("get_objects", [unique])
                    .then(accounts => {

                        if (this.props.dexListAccounts) {
                            let dexListAccounts = this.props.dexListAccounts;
                            let dexBlacklisted = dexListAccounts.get("blacklisted_accounts");
                            let allowedAccounts = [];
                            let allowedTradesBuy = [];

                            // check if infinity && if in DEX blacklist
                            for (let account in accounts) {
                                if (accounts[account]['referral_status_type'] == 4 && dexBlacklisted.indexOf(accounts[account]['id']) == -1) {
                                    allowedAccounts.push(accounts[account]['id'])
                                }
                            }

                            for (let trade in tradesBuy) {
                                if (allowedAccounts.includes(tradesBuy[trade]['pa']["p2p_gateway"])) {
                                    for (let rate in ratesFilter) {
                                        if (new RegExp(ratesFilter[rate]['filter'].join("|")).test(tradesBuy[trade]['pa']['currency'].toUpperCase()) || rate == tradesBuy[trade]['pa']['currency'].toUpperCase()) {
                                            let price = parseFloat(tradesBuy[trade]['pa']["price"] / 100000000).toFixed(8)
                                            if (price <= ratesFilter[rate]['max'] && price >= ratesFilter[rate]['min']) {
                                                allowedTradesBuy.push(tradesBuy[trade])
                                            }
                                        }
                                    }
                                }
                            }

                            this.setState({
                                buyAds: allowedTradesBuy
                            });
                        }
                    });
            });
        Apis.instance()
            .db_api()
            .exec("get_p2p_adv", [currentAccount, 0])
            .then(tradesSell => {
                // filter traders by inifinity status
                for (let trade in tradesSell) {
                    gateways.push(tradesSell[trade]['pa']["p2p_gateway"]);
                }
                let unique = gateways.filter(this.onlyUnique);

                Apis.instance()
                    .db_api()
                    .exec("get_objects", [unique])
                    .then(accounts => {
                        let allowedAccounts = []
                        for (let account in accounts) {
                            if (accounts[account]['referral_status_type'] == 4) {
                                allowedAccounts.push(accounts[account]['id'])
                            }
                        }
                        let allowedTradesSell = []
                        for (let trade in tradesSell) {
                            if (allowedAccounts.includes(tradesSell[trade]['pa']["p2p_gateway"])) {
                                if (allowedAccounts.includes(tradesSell[trade]['pa']["p2p_gateway"])) {
                                    for (let rate in ratesFilter) {
                                        if (new RegExp(ratesFilter[rate]['filter'].join("|")).test(tradesSell[trade]['pa']['currency'].toUpperCase()) || rate == tradesSell[trade]['pa']['currency'].toUpperCase()) {
                                            let price = parseFloat(tradesSell[trade]['pa']["price"] / 100000000).toFixed(8)
                                            if (price <= ratesFilter[rate]['max'] && price >= ratesFilter[rate]['min']) {
                                                allowedTradesSell.push(tradesSell[trade])
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        this.setState({
                            sellAds: allowedTradesSell
                        });
                    });
            });
    }

    sortByExRate() {
        this.setState({
            isSorted: false
        });
    }

    sortByRating() {
        this.setState({
            isSorted: true
        });
    }

    filterBySearchValue() {
        let value = document.getElementById("tradeAdsFilter").value.trim();
        value = value.toLowerCase();

        this.setState({
            searchstring: value
        });
    }

    showAllTrades() {
        document.getElementById("tradeAdsFilter").value = "";

        this.setState({
            searchstring: ""
        });
    }

    render() {
        let {searchstring, isSorted, currentAccount} = this.state;

        let buyAds_non_filter = this.state.buyAds;
        let buyAds = [];
        buyAds_non_filter.map(activeItem => {
            if (searchstring != "") {
                if (
                    activeItem["pa"]["adv_description"]
                        .toLowerCase()
                        .search(searchstring) != -1 ||
                    activeItem["pa"]["geo"]
                        .toLowerCase()
                        .search(searchstring) != -1 ||
                    activeItem["pa"]["currency"]
                        .toLowerCase()
                        .search(searchstring) != -1
                ) {
                    buyAds.push(activeItem);
                }
            } else {
                buyAds.push(activeItem);
            }
        });
        let buyAdsSorted = buyAds_non_filter.sort((a, b) => {
            return parseInt(b.rating) - parseInt(a.rating);
        });

        let topAccountsBuy = [];
        let topNumber = 5;
        buyAdsSorted.map(activeItem => {
            if (
                topAccountsBuy.length < topNumber &&
                !topAccountsBuy.includes(activeItem["pa"]["p2p_gateway"])
            ) {
                topAccountsBuy.push(activeItem["pa"]["p2p_gateway"]);
            }
        });
        let sellAds_non_filter = this.state.sellAds;
        let sellAds = [];
        sellAds_non_filter.map(activeItem => {
            if (searchstring != "") {
                if (
                    activeItem["pa"]["adv_description"]
                        .toLowerCase()
                        .search(searchstring) != -1 ||
                    activeItem["pa"]["geo"]
                        .toLowerCase()
                        .search(searchstring) != -1 ||
                    activeItem["pa"]["currency"]
                        .toLowerCase()
                        .search(searchstring) != -1
                ) {
                    sellAds.push(activeItem);
                }
            } else {
                sellAds.push(activeItem);
            }
        });

        let sellAdsSorted = sellAds_non_filter.sort((a, b) => {
            return parseInt(b.rating) - parseInt(a.rating);
        });

        let topAccountsSell = [];

        sellAdsSorted.map(activeItem => {
            if (
                topAccountsSell.length < topNumber &&
                !topAccountsSell.includes(activeItem["pa"]["p2p_gateway"])
            ) {
                topAccountsSell.push(activeItem["pa"]["p2p_gateway"]);
            }
        });

        return (
            <div>
                <Tabs
                    className="cwd-tabs cwd-tabs--cascade-mode"
                    tabsClass="cwd-tabs__list"
                    contentClass="cwd-tabs__content"
                    segmented={false}
                    actionButtons={false}
                >
                    <Tab title="cwdgateway.ads.buy_cwd">
                        <TradeSorterFilter
                            isSorted={isSorted}
                            sortByExRate={this.sortByExRate}
                            sortByRating={this.sortByRating}
                            filterBySearchValue={this.filterBySearchValue}
                            showAllTrades={this.showAllTrades}
                        />

                        {buyAds.length > 0 ? (
                            <ul className="cwdgateway-active__list">
                                {isSorted
                                    ? buyAds
                                        .sort((a, b) => {
                                            return (
                                                parseInt(b.rating) -
                                                parseInt(a.rating)
                                            );
                                        })
                                        .map(activeItem =>
                                            activeItem["pa"]["max_cwd"] >=
                                                activeItem["pa"]["min_cwd"] ? (
                                                <TradeItemBuy
                                                    key={
                                                        activeItem["pa"]["id"]
                                                    }
                                                    buyAds={activeItem}
                                                    currentAccount={
                                                        currentAccount
                                                    }
                                                    isTop={
                                                        topAccountsBuy.includes(
                                                            activeItem["pa"][
                                                            "p2p_gateway"
                                                            ]
                                                        )
                                                            ? true
                                                            : false
                                                    }
                                                />
                                            ) : null
                                        )
                                    : buyAds
                                        .sort((a, b) => {
                                            if (
                                                parseInt(b.pa.price) <
                                                parseInt(a.pa.price)
                                            )
                                                return 1;
                                            else if (
                                                parseInt(b.pa.price) >
                                                parseInt(a.pa.price)
                                            )
                                                return -1;
                                            else
                                                return (
                                                    parseInt(b.rating) -
                                                    parseInt(a.rating)
                                                );
                                        })
                                        .map(activeItem =>
                                            activeItem["pa"]["max_cwd"] >=
                                                activeItem["pa"]["min_cwd"] ? (
                                                <TradeItemBuy
                                                    key={
                                                        activeItem["pa"]["id"]
                                                    }
                                                    buyAds={activeItem}
                                                    currentAccount={
                                                        currentAccount
                                                    }
                                                    isTop={
                                                        topAccountsBuy.includes(
                                                            activeItem["pa"][
                                                            "p2p_gateway"
                                                            ]
                                                        )
                                                            ? true
                                                            : false
                                                    }
                                                />
                                            ) : null
                                        )}
                            </ul>
                        ) : (
                            <Translate
                                className="cwdgateway__no-data"
                                content="cwdgateway.ads.no_buy_trades"
                            />
                        )}
                    </Tab>

                    <Tab title="cwdgateway.ads.sell_cwd">
                        <TradeSorterFilter
                            isSorted={isSorted}
                            sortByExRate={this.sortByExRate}
                            sortByRating={this.sortByRating}
                            filterBySearchValue={this.filterBySearchValue}
                            showAllTrades={this.showAllTrades}
                        />

                        {sellAds.length > 0 ? (
                            <ul className="cwdgateway-active__list">
                                {isSorted
                                    ? sellAds
                                        .sort((a, b) => {
                                            return (
                                                parseInt(b.rating) -
                                                parseInt(a.rating)
                                            );
                                        })
                                        .map(activeItem => (
                                            <TradeItemSell
                                                key={activeItem["pa"]["id"]}
                                                sellAds={activeItem}
                                                currentAccount={
                                                    currentAccount
                                                }
                                                isTop={
                                                    topAccountsSell.includes(
                                                        activeItem["pa"][
                                                        "p2p_gateway"
                                                        ]
                                                    )
                                                        ? true
                                                        : false
                                                }
                                            />
                                        ))
                                    : sellAds
                                        .sort((a, b) => {
                                            if (
                                                parseInt(b.pa.price) <
                                                parseInt(a.pa.price)
                                            )
                                                return -1;
                                            else if (
                                                parseInt(b.pa.price) >
                                                parseInt(a.pa.price)
                                            )
                                                return 1;
                                            else
                                                return (
                                                    parseInt(b.rating) -
                                                    parseInt(a.rating)
                                                );
                                        })
                                        .map(activeItem => (
                                            <TradeItemSell
                                                key={activeItem["pa"]["id"]}
                                                sellAds={activeItem}
                                                currentAccount={
                                                    currentAccount
                                                }
                                                isTop={
                                                    topAccountsSell.includes(
                                                        activeItem["pa"][
                                                        "p2p_gateway"
                                                        ]
                                                    )
                                                        ? true
                                                        : false
                                                }
                                            />
                                        ))}
                            </ul>
                        ) : (
                            <Translate
                                className="cwdgateway__no-data"
                                content="cwdgateway.ads.no_sell_trades"
                            />
                        )}
                    </Tab>
                </Tabs>
            </div>
        );
    }
}

export default ActiveAdsList = connect(ActiveAdsList, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        return {
            dexListAccounts: ChainStore.fetchFullAccount("cwdex-list")
        };
    }
});

import React from "react";
import BalanceComponent from "../../Utility/BalanceComponent";
import AccountActions from "actions/AccountActions";
import Translate from "react-translate-component";
import AccountSelector from "../../Account/AccountSelector";
import AccountStore from "stores/AccountStore";
import AmountSelector from "../../Utility/AmountSelector";
import utils from "common/utils";
import counterpart from "counterpart";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import Immutable from "immutable";
import {ChainStore} from "bitsharesjs/es";
import {checkFeeStatusAsync, checkBalance} from "common/trxHelper";
import {debounce, isNaN} from "lodash";
import {Asset} from "common/MarketClasses";
import {Link} from "react-router-dom";

class TransferBTC extends React.Component {
    constructor(props) {
        super(props);
        this.state = TransferBTC.getInitialState();
        this.state.asset_id = this.props.transferAsset;

        let currentAccount = AccountStore.getState().currentAccount;
        if (!this.state.from_name) this.state.from_name = currentAccount;
        this.onTrxIncluded = this.onTrxIncluded.bind(this);

        this._updateFee = debounce(this._updateFee.bind(this), 250);
        this._checkFeeStatus = this._checkFeeStatus.bind(this);
        this._checkBalance = this._checkBalance.bind(this);
    }

    static getInitialState() {
        return {
            from_name: "",
            to_name: "btc-gateway",
            from_account: null,
            to_account: null,
            amount: 0,
            asset: null,
            memo: "",
            error: null,
            propose: false,
            propose_account: "",
            feeAsset: null,
            fee_asset_id: "1.3.0",
            feeAmount: new Asset({amount: 0}),
            feeStatus: {}
        };
    }

    UNSAFE_componentWillMount() {
        this.nestedRef = null;
        this._updateFee();
        this._checkFeeStatus();
    }

    UNSAFE_componentWillReceiveProps(np) {
        if (
            np.currentAccount !== this.state.from_name &&
            np.currentAccount !== this.props.currentAccount
        ) {
            this.setState(
                {
                    from_name: np.currentAccount,
                    from_account: ChainStore.getAccount(np.currentAccount),
                    feeStatus: {},
                    fee_asset_id: "1.3.0",
                    feeAmount: new Asset({amount: 0})
                },
                () => {
                    this._updateFee();
                    this._checkFeeStatus(
                        ChainStore.getAccount(np.currentAccount)
                    );
                }
            );
        }
    }

    _checkBalance() {
        const {feeAmount, amount, from_account, asset} = this.state;
        if (!asset) return;
        const balanceID = from_account.getIn(["balances", asset.get("id")]);
        const feeBalanceID = from_account.getIn([
            "balances",
            feeAmount.asset_id
        ]);
        if (!asset || !from_account) return;
        if (!balanceID) return this.setState({balanceError: true});
        let balanceObject = ChainStore.getObject(balanceID);
        let feeBalanceObject = feeBalanceID
            ? ChainStore.getObject(feeBalanceID)
            : null;
        if (!feeBalanceObject || feeBalanceObject.get("balance") === 0) {
            this.setState({fee_asset_id: "1.3.0"}, this._updateFee);
        }
        if (!balanceObject || !feeAmount) return;
        const hasBalance = checkBalance(
            amount,
            asset,
            feeAmount,
            balanceObject
        );
        if (hasBalance === null) return;
        this.setState({balanceError: !hasBalance});
    }

    _checkFeeStatus(account = this.state.from_account) {
        if (!account) return;

        const assets = Object.keys(account.get("balances").toJS()).sort(
            utils.sortID
        );
        let feeStatus = {};
        let p = [];
        assets.forEach(a => {
            p.push(
                checkFeeStatusAsync({
                    accountID: account.get("id"),
                    feeID: a,
                    options: ["price_per_kbyte"],
                    data: {
                        type: "memo",
                        content: this.state.memo
                    }
                })
            );
        });
        Promise.all(p)
            .then(status => {
                assets.forEach((a, idx) => {
                    feeStatus[a] = status[idx];
                });
                if (!utils.are_equal_shallow(this.state.feeStatus, feeStatus)) {
                    this.setState({
                        feeStatus
                    });
                }
                this._checkBalance();
            })
            .catch(err => {
                console.error(err);
            });
    }

    _updateFee(state = this.state) {
        let {fee_asset_id, from_account} = state;
        const {fee_asset_types} = this._getAvailableAssets(state);
        if (
            fee_asset_types.length === 1 &&
            fee_asset_types[0] !== fee_asset_id
        ) {
            fee_asset_id = fee_asset_types[0];
        }
        if (!from_account) return null;
        checkFeeStatusAsync({
            accountID: from_account.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"],
            data: {
                type: "memo",
                content: state.memo
            }
        }).then(({fee, hasBalance, hasPoolBalance}) => {
            this.setState({
                feeAmount: fee,
                fee_asset_id: fee.asset_id,
                hasBalance,
                hasPoolBalance,
                error: !hasBalance || !hasPoolBalance
            });
        });
    }

    fromChanged(from_name) {
        if (!from_name) this.setState({from_account: null});
        this.setState({
            from_name,
            error: null,
            propose: false,
            propose_account: ""
        });
    }

    toChanged(to_name) {
        this.setState({to_name, error: null});
    }

    onFromAccountChanged(from_account) {
        this.setState({from_account, error: null}, () => {
            this._updateFee();
            this._checkFeeStatus();
        });
    }

    onToAccountChanged(to_account) {
        this.setState({to_account, error: null});
    }

    onAmountChanged({amount, asset}) {
        if (!asset) {
            return;
        }
        this.setState(
            {amount, asset, asset_id: asset.get("id"), error: null},
            this._checkBalance
        );
    }

    onFeeChanged({asset}) {
        this.setState(
            {feeAsset: asset, fee_asset_id: asset.get("id"), error: null},
            this._updateFee
        );
    }

    onMemoChanged(e) {
        this.setState({memo: e.target.value}, this._updateFee);
    }

    onTrxIncluded(confirm_store_state) {
        if (
            confirm_store_state.included &&
            confirm_store_state.broadcasted_transaction
        ) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        } else if (confirm_store_state.closed) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        }
    }

    onPropose(propose, e) {
        e.preventDefault();
        this.setState({propose, propose_account: null});
    }

    onProposeAccount(propose_account) {
        this.setState({propose_account});
    }

    onSubmit(e) {
        e.preventDefault();
        this.setState({error: null});

        let isScam = false;
        let scamAccounts = ChainStore.fetchFullAccount("scam-accounts");

        if (this.props.account && scamAccounts) {
            isScam =
                scamAccounts
                    .get("blacklisted_accounts")
                    .indexOf(this.props.account.get("id")) >= 0;

            if (!isScam) {
                const {asset, amount} = this.state;
                const sendAmount = new Asset({
                    real: amount,
                    asset_id: asset.get("id"),
                    precision: asset.get("precision")
                });
                AccountActions.transfer(
                    this.state.from_account.get("id"),
                    this.state.to_account.get("id"),
                    sendAmount.getAmount(),
                    asset.get("id"),
                    this.state.memo
                        ? new Buffer(this.state.memo, "utf-8")
                        : this.state.memo,
                    this.state.propose ? this.state.propose_account : null,
                    this.state.feeAsset
                        ? this.state.feeAsset.get("id")
                        : "1.3.0"
                )
                    .then(() => {
                        TransactionConfirmStore.unlisten(this.onTrxIncluded);
                        TransactionConfirmStore.listen(this.onTrxIncluded);
                    })
                    .catch(e => {
                        let msg = e.message ? e.message.split("\n")[1] : null;
                        console.log("error: ", e, msg);
                        this.setState({error: msg});
                    });
            } else {
                this.props.history.push("/");
            }
        }
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    _setTotal(asset_id, balance_id) {
        const {feeAmount} = this.state;
        let balanceObject = ChainStore.getObject(balance_id);
        let transferAsset = ChainStore.getObject(asset_id);

        let balance = new Asset({
            amount: balanceObject.get("balance"),
            asset_id: transferAsset.get("id"),
            precision: transferAsset.get("precision")
        });

        if (balanceObject) {
            if (feeAmount.asset_id === balance.asset_id) {
                balance.minus(feeAmount);
            }
            this.setState(
                {amount: balance.getAmount({real: true})},
                this._checkBalance
            );
        }
    }

    _getAvailableAssets(state = this.state) {
        const {feeStatus} = this.state;
        function hasFeePoolBalance(id) {
            if (feeStatus[id] === undefined) return true;
            return feeStatus[id] && feeStatus[id].hasPoolBalance;
        }

        function hasBalance(id) {
            if (feeStatus[id] === undefined) return true;
            return feeStatus[id] && feeStatus[id].hasBalance;
        }

        const {from_account, from_error} = state;
        let asset_types = [],
            fee_asset_types = [];
        if (!(from_account && from_account.get("balances") && !from_error)) {
            return {asset_types, fee_asset_types};
        }
        let account_balances = state.from_account.get("balances").toJS();
        asset_types = Object.keys(account_balances).sort(utils.sortID);
        fee_asset_types = Object.keys(account_balances).sort(utils.sortID);
        for (let key in account_balances) {
            let balanceObject = ChainStore.getObject(account_balances[key]);
            if (balanceObject && balanceObject.get("balance") === 0) {
                asset_types.splice(asset_types.indexOf(key), 1);
                if (fee_asset_types.indexOf(key) !== -1) {
                    fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
                }
            }
        }

        fee_asset_types = fee_asset_types.filter(a => {
            return hasFeePoolBalance(a) && hasBalance(a);
        });

        return {asset_types, fee_asset_types};
    }

    _onAccountDropdown(account) {
        let newAccount = ChainStore.getAccount(account);
        if (newAccount) {
            this.setState({
                from_name: account,
                from_account: ChainStore.getAccount(account)
            });
        }
    }

    render() {
        let from_error = null;
        let {
            propose,
            from_account,
            to_account,
            asset,
            asset_id,
            propose_account,
            feeAmount,
            amount,
            error,
            to_name,
            from_name,
            memo,
            feeAsset,
            fee_asset_id,
            balanceError
        } = this.state;

        let from_my_account =
            AccountStore.isMyAccount(from_account) ||
            from_name === this.props.passwordAccount;

        if (from_account && !from_my_account && !propose) {
            from_error = (
                <span>
                    {counterpart.translate("account.errors.not_yours")}
                    &nbsp;(
                    <a onClick={this.onPropose.bind(this, true)}>
                        {counterpart.translate("propose")}
                    </a>
                    )
                </span>
            );
        }

        let {asset_types, fee_asset_types} = this._getAvailableAssets();
        let balance = null;

        // Estimate fee
        let fee = this.state.feeAmount.getAmount({real: true});
        if (from_account && from_account.get("balances") && !from_error) {
            let account_balances = from_account.get("balances").toJS();
            if (asset_types.length === 1)
                asset = ChainStore.getAsset(asset_types[0]);
            if (asset_types.length > 0) {
                let current_asset_id = asset ? asset.get("id") : asset_types[0];
                let feeID = feeAsset ? feeAsset.get("id") : "1.3.0";
                balance = (
                    <span
                        style={{
                            borderBottom: "#A09F9F 1px dotted",
                            cursor: "pointer"
                        }}
                        onClick={this._setTotal.bind(
                            this,
                            current_asset_id,
                            account_balances["1.3.3"],
                            fee,
                            feeID
                        )}
                    >
                        <Translate
                            component="span"
                            content="transfer.available"
                        />{" "}
                        <BalanceComponent balance={account_balances["1.3.3"]} />
                    </span>
                );
            } else {
                balance = null;
            }
        }

        let propose_incomplete = propose && !propose_account;
        const amountValue = parseFloat(
            String.prototype.replace.call(amount, /,/g, "")
        );
        const isAmountValid = amountValue && !isNaN(amountValue);
        const isToAccountValid =
            to_account && to_account.get("name") === to_name;
        const isSendNotValid =
            !from_account ||
            !isToAccountValid ||
            !isAmountValid ||
            !asset ||
            from_error ||
            propose_incomplete ||
            balanceError;
        let accountsList = Immutable.Set();
        accountsList = accountsList.add(from_account);
        let tabIndex = 1;

        return (
            <section className="gatewayTransfer__transfer-wrap">
                <form
                    className="gatewayTransfer__form"
                    id="transferBtcForm"
                    onSubmit={this.onSubmit.bind(this)}
                    noValidate
                >
                    <Translate
                        content="cwdgateway.gateways.withdraw_text"
                        component="p"
                        className="cwd-common__description"
                    />

                    {/*  F R O M  */}
                    <div className="gatewayTransfer__field-hidden">
                        <AccountSelector
                            label="transfer.from"
                            ref="from"
                            accountName={from_name}
                            onChange={this.fromChanged.bind(this)}
                            onAccountChanged={this.onFromAccountChanged.bind(
                                this
                            )}
                            account={from_name}
                            size={60}
                            error={from_error}
                            tabIndex={tabIndex++}
                        />
                    </div>

                    {/*  T O  */}
                    <div className="gatewayTransfer__field-hidden">
                        <AccountSelector
                            label="transfer.to"
                            accountName={to_name}
                            onChange={this.toChanged.bind(this)}
                            onAccountChanged={this.onToAccountChanged.bind(
                                this
                            )}
                            account={to_name}
                            size={60}
                            tabIndex={tabIndex++}
                            allowUppercase={false}
                        />
                    </div>

                    <div className="gatewayTransfer__amount-wrap">
                        {/*  A M O U N T   */}
                        <div
                            className="gatewayTransfer__field-wrap"
                            id="BTCAmountBlock"
                        >
                            <AmountSelector
                                label="transfer.amount"
                                amount={amount}
                                onChange={this.onAmountChanged.bind(this)}
                                asset={
                                    asset_types.length > 0 && asset
                                        ? asset.get("id")
                                        : asset_id
                                        ? asset_id
                                        : asset_types[3]
                                }
                                assets={["1.3.3"]}
                                display_balance={balance}
                                tabIndex={tabIndex++}
                            />
                            {this.state.balanceError &&
                            asset.get("id") == "1.3.3" ? (
                                <div className="gatewayTransfer__has-error-wrap">
                                    <p className="has-error">
                                        <Translate content="transfer.errors.insufficient" />
                                    </p>
                                    <Link
                                        to={`/finance-dashboard`}
                                        className="gatewayTransfer__deposit-link"
                                    >
                                        <Translate content="account.nav_menu.deposit_link" />
                                    </Link>
                                </div>
                            ) : null}
                        </div>

                        {/*  F E E   */}
                        <div>
                            <div className="gatewayTransfer__field-wrap">
                                <AmountSelector
                                    refCallback={this.setNestedRef.bind(this)}
                                    label="transfer.fee"
                                    disabled={true}
                                    amount={fee}
                                    onChange={this.onFeeChanged.bind(this)}
                                    asset={
                                        fee_asset_types.length && feeAmount
                                            ? feeAmount.asset_id
                                            : fee_asset_types.length === 1
                                            ? fee_asset_types[0]
                                            : fee_asset_id
                                            ? fee_asset_id
                                            : fee_asset_types[0]
                                    }
                                    assets={["1.3.0", "1.3.3"]}
                                    tabIndex={tabIndex++}
                                    error={
                                        this.state.hasPoolBalance === false
                                            ? "transfer.errors.insufficient"
                                            : null
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="gatewayTransfer__footer-wrap">
                        {/*  M E M O  */}
                        <div className="gatewayTransfer__memo-wrap">
                            <Translate
                                className="left-label tooltip"
                                component="label"
                                content="cwdgateway.gateways.memo"
                                data-place="top"
                            />

                            <input
                                type="text"
                                value={memo}
                                tabIndex={tabIndex++}
                                onChange={this.onMemoChanged.bind(this)}
                            />
                        </div>

                        <div className="gatewayTransfer__btn-wrap">
                            <button
                                className="gatewayTransfer__btn"
                                type="submit"
                                value="Submit"
                                tabIndex={tabIndex++}
                                id="buyAdBtn"
                            >
                                <Translate
                                    component="span"
                                    content="transfer.send"
                                />
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        );
    }
}

export default TransferBTC;

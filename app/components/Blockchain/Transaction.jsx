import React from "react";
import PropTypes from "prop-types";
import FormattedAsset from "../Utility/FormattedAsset";
import { Link as RealLink } from "react-router-dom";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import classNames from "classnames";
import { FormattedDate } from "react-intl";
import Inspector from "react-json-inspector";
import utils from "common/utils";
import LinkToAccountById from "../Utility/LinkToAccountById";
import LinkToAssetById from "../Utility/LinkToAssetById";
import FormattedPrice from "../Utility/FormattedPrice";
import account_constants from "chain/account_constants";
import NewIcon from "../NewIcon/NewIcon";
import PrivateKeyStore from "stores/PrivateKeyStore";
import WalletUnlockActions from "actions/WalletUnlockActions";
import ProposedOperation from "./ProposedOperation";
import { ChainTypes } from "bitsharesjs";
let { operations } = ChainTypes;
import ReactTooltip from "react-tooltip";
import moment from "moment";
import {
    Link,
    DirectLink,
    Element,
    Events,
    animateScroll as scroll,
    scrollSpy,
    scroller
} from "react-scroll";
import { Tooltip } from "crowdwiz-ui-modal";

require("./scss/operation.scss");
require("./json-inspector.scss");

let ops = Object.keys(operations);
let listings = Object.keys(account_constants.account_listing);

const TranslateBoolean = ({ value, ...otherProps }) => (
    <Translate
        content={`boolean.${value ? "true" : "false"}`}
        {...otherProps}
    />
);

class OpType extends React.Component {
    shouldComponentUpdate(nextProps) {
        return nextProps.type !== this.props.type;
    }

    render() {
        let trxTypes = counterpart.translate("transaction.trxTypes");
        let labelClass = classNames("txtlabel", this.props.color || "info");

        return (
            <tr>
                <td>
                    <span className={labelClass}>
                        {this.props.txIndex >= 0 ? (
                            <span>
                                #{this.props.txIndex + 1}
                                :&nbsp;
                            </span>
                        ) : (
                            ""
                        )}
                        {trxTypes[ops[this.props.type]]}
                    </span>
                </td>
                <td />
            </tr>
        );
    }
}

class NoLinkDecorator extends React.Component {
    render() {
        return <span>{this.props.children}</span>;
    }
}

class OperationTable extends React.Component {
    render() {
        let fee_row =
            this.props.fee.amount > 0 ? (
                <tr>
                    <td>
                        <Translate component="span" content="transfer.fee" />
                    </td>
                    <td>
                        <FormattedAsset
                            color="fee"
                            amount={this.props.fee.amount}
                            asset={this.props.fee.asset_id}
                        />
                    </td>
                </tr>
            ) : null;

        return (
            <div>
                {/*  <h6><Translate component="span" content="explorer.block.op" /> #{this.props.index + 1}/{this.props.opCount}</h6> */}
                <table style={{ marginBottom: "1em" }} className="table op-table">
                    <caption />
                    <tbody>
                        <OpType
                            txIndex={this.props.txIndex}
                            type={this.props.type}
                            color={this.props.color}
                        />
                        {this.props.children}
                        {fee_row}
                    </tbody>
                </table>
            </div>
        );
    }
}

class Transaction extends React.Component {
    componentDidMount() {
        ReactTooltip.rebuild();
    }

    linkToAccount(name_or_id) {
        if (!name_or_id) return <span>-</span>;
        let Link = this.props.no_links ? NoLinkDecorator : RealLink;
        return utils.is_object_id(name_or_id) ? (
            <LinkToAccountById account={name_or_id} />
        ) : (
            <Link to={`/account/${name_or_id}`}>{name_or_id}</Link>
        );
    }

    linkToAsset(symbol_or_id) {
        if (!symbol_or_id) return <span>-</span>;
        let Link = this.props.no_links ? NoLinkDecorator : RealLink;
        return utils.is_object_id(symbol_or_id) ? (
            <LinkToAssetById asset={symbol_or_id} />
        ) : (
            <Link to={`/asset/${symbol_or_id}`}>{symbol_or_id}</Link>
        );
    }

    _toggleLock(e) {
        e.preventDefault();
        WalletUnlockActions.unlock()
            .then(() => {
                this.forceUpdate();
            })
            .catch(() => { });
    }

    render() {
        let price;
        let { trx } = this.props;
        let info = null;
        info = [];

        let opCount = trx.operations.length;
        let memo = null;

        trx.operations.forEach((op, opIndex) => {
            let rows = [];
            let key = 0;

            let color = "";
            switch (
            ops[op[0]] // For a list of trx types, see chain_types.coffee
            ) {
                case "transfer":
                    color = "success";

                    if (op[1].memo) {
                        let { text, isMine } = PrivateKeyStore.decodeMemo(
                            op[1].memo
                        );

                        memo = text ? (
                            <td
                                className="memo"
                                style={{ wordBreak: "break-all" }}
                            >
                                {text}
                            </td>
                        ) : !text && isMine ? (
                            <td>
                                <Translate content="transfer.memo_unlock" />
                                &nbsp;
                                <a onClick={this._toggleLock.bind(this)}>
                                    <NewIcon
                                        iconWidth={16}
                                        iconHeight={16}
                                        iconName={"locked"}
                                    />
                                </a>
                            </td>
                        ) : null;
                    }

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.from"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].from)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.to"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].to)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    {
                        memo
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate content="transfer.memo" />
                                    </td>
                                    {memo}
                                </tr>
                            )
                            : null;
                    }

                    break;

                // ==========================================================================

                case "limit_order_create":
                    color = "warning";
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="exchange.price"
                                />
                            </td>
                            <td>
                                <FormattedPrice
                                    base_asset={op[1].amount_to_sell.asset_id}
                                    quote_asset={op[1].min_to_receive.asset_id}
                                    base_amount={op[1].amount_to_sell.amount}
                                    quote_amount={op[1].min_to_receive.amount}
                                    noPopOver
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="exchange.sell"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount_to_sell.amount}
                                    asset={op[1].amount_to_sell.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Tooltip
                                    placement="left"
                                    title={counterpart.translate(
                                        "tooltip.buy_min"
                                    )}
                                >
                                    <Translate
                                        component="span"
                                        content="exchange.buy_min"
                                    />
                                </Tooltip>
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].min_to_receive.amount}
                                    asset={op[1].min_to_receive.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    // rows.push(
                    //     <tr key="2">
                    //         <td><Translate component="span" content="transaction.min_receive" /></td>
                    //         <td>{!missingAssets[1] ? <FormattedAsset amount={op[1].min_to_receive.amount} asset={op[1].min_to_receive.asset_id} /> : null}</td>
                    //     </tr>
                    // );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.seller"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].seller)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.expiration"
                                />
                            </td>
                            <td>
                                <FormattedDate
                                    value={moment.utc(op[1].expiration)}
                                    format="full"
                                    timeZoneName="short"
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "limit_order_cancel":
                    color = "cancel";
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.order_id"
                                />
                            </td>
                            <td>{op[1].order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.fee_payer"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].fee_paying_account)}
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "short_order_cancel":
                    color = "cancel";
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.order_id"
                                />
                            </td>
                            <td>{op[1].order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.fee_payer"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].fee_paying_account)}
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "call_order_update":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.funding_account"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].funding_account)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.delta_collateral"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].delta_collateral.amount}
                                    asset={op[1].delta_collateral.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.delta_debt"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].delta_debt.amount}
                                    asset={op[1].delta_debt.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    if (
                        !!op[1].extensions &&
                        !!op[1].extensions.target_collateral_ratio
                    ) {
                        rows.push(
                            <tr key={key++}>
                                <td>
                                    <Translate
                                        component="span"
                                        content="transaction.collateral_target"
                                    />
                                </td>
                                <td>
                                    {op[1].extensions.target_collateral_ratio /
                                        1000}
                                </td>
                            </tr>
                        );
                    }

                    break;

                // ==========================================================================

                case "key_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.fee_payer"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].fee_paying_account)}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.key"
                                />
                            </td>
                            <td>{op[1].key_data[1]}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "account_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.name"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].name)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.member.registrar"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].registrar)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.member.lifetime_referrer"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].referrer)}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "account_update":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.name"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].account)}</td>
                        </tr>
                    );
                    if (op[1].new_options) {
                        if (op[1].new_options.voting_account) {
                            rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="account.votes.proxy"
                                        />
                                    </td>
                                    <td>
                                        {this.linkToAccount(
                                            op[1].new_options.voting_account
                                        )}
                                    </td>
                                </tr>
                            );
                        } else {
                            rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="account.votes.proxy"
                                        />
                                    </td>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="account.votes.no_proxy"
                                        />
                                    </td>
                                </tr>
                            );
                            rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="account.options.num_committee"
                                        />
                                    </td>
                                    <td>{op[1].new_options.num_committee}</td>
                                </tr>
                            );
                            rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="account.options.num_witnesses"
                                        />
                                    </td>
                                    <td>{op[1].new_options.num_witness}</td>
                                </tr>
                            );
                            rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="account.options.votes"
                                        />
                                    </td>
                                    <td>
                                        {JSON.stringify(
                                            op[1].new_options.votes
                                        )}
                                    </td>
                                </tr>
                            );
                        }

                        rows.push(
                            <tr key={key++}>
                                <td>
                                    <Translate
                                        component="span"
                                        content="account.options.memo_key"
                                    />
                                </td>
                                <td>
                                    {op[1].new_options.memo_key.substring(
                                        0,
                                        10
                                    ) + "..."}
                                </td>
                            </tr>
                        );
                    }

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.common_options"
                                />
                            </td>
                            <td>
                                <Inspector data={op[1]} search={false} />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "account_whitelist":
                    let listing;
                    for (var i = 0; i < listings.length; i++) {
                        if (
                            account_constants.account_listing[listings[i]] ===
                            op[1].new_listing
                        ) {
                            listing = listings[i];
                        }
                    }

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.authorizing_account"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].authorizing_account)}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.listed_account"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].account_to_list)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.new_listing"
                                />
                            </td>
                            <td>
                                <Translate
                                    content={`transaction.whitelist_states.${listing}`}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "account_upgrade":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.account_upgrade"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].account_to_upgrade)}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.lifetime"
                                />
                            </td>
                            <td>
                                {op[1].upgrade_to_lifetime_member.toString()}
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "account_transfer":
                    /* This case is uncomplete, needs filling out with proper fields */
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.from"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].account_id)}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_create":
                    color = "warning";

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.assets.issuer"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].issuer)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.assets.symbol"
                                />
                            </td>
                            <td>{this.linkToAsset(op[1].symbol)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.assets.precision"
                                />
                            </td>
                            <td>{op[1].precision}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.user_issued_assets.max_supply"
                                />
                            </td>
                            <td>
                                {utils.format_asset(
                                    op[1].common_options.max_supply,
                                    op[1]
                                )}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.user_issued_assets.description"
                                />
                            </td>
                            <td>{op[1].common_options.description}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.market_fee"
                                />
                            </td>
                            <td>
                                {op[1].common_options.market_fee_percent / 100}%
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.max_market_fee"
                                />
                            </td>
                            <td>
                                {utils.format_asset(
                                    op[1].common_options.max_market_fee,
                                    op[1]
                                )}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.common_options"
                                />
                            </td>
                            <td>
                                <Inspector data={op[1]} search={false} />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_update":
                case "asset_update_bitasset":
                    color = "warning";

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.asset_update"
                                />
                            </td>
                            <td>{this.linkToAsset(op[1].asset_to_update)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.assets.issuer"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].issuer)}</td>
                        </tr>
                    );
                    if (op[1].new_issuer !== op[1].issuer) {
                        rows.push(
                            <tr key={key++}>
                                <td>
                                    <Translate
                                        component="span"
                                        content="account.user_issued_assets.new_issuer"
                                    />
                                </td>
                                <td>{this.linkToAccount(op[1].new_issuer)}</td>
                            </tr>
                        );
                    }
                    if (op[1].new_options.core_exchange_rate) {
                        rows.push(
                            <tr key={key++}>
                                <td>
                                    <Translate
                                        component="span"
                                        content="markets.core_rate"
                                    />
                                </td>
                                <td>
                                    <FormattedPrice
                                        base_asset={
                                            op[1].new_options.core_exchange_rate
                                                .base.asset_id
                                        }
                                        quote_asset={
                                            op[1].new_options.core_exchange_rate
                                                .quote.asset_id
                                        }
                                        base_amount={
                                            op[1].new_options.core_exchange_rate
                                                .base.amount
                                        }
                                        quote_amount={
                                            op[1].new_options.core_exchange_rate
                                                .quote.amount
                                        }
                                        noPopOver
                                    />
                                </td>
                            </tr>
                        );
                    }

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.new_options"
                                />
                            </td>
                            <td>
                                <Inspector
                                    data={op[1].new_options}
                                    search={false}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_update_feed_producers":
                    color = "warning";
                    let producers = [];
                    op[1].new_feed_producers.forEach(producer => {
                        // let missingAsset = this.getAccounts([producer])[0];
                        producers.push(
                            <div>
                                {this.linkToAccount(producer)}
                                <br />
                            </div>
                        );
                    });

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.asset_update"
                                />
                            </td>
                            <td>{this.linkToAsset(op[1].asset_to_update)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.new_producers"
                                />
                            </td>
                            <td>{producers}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_issue":
                    color = "warning";

                    if (op[1].memo) {
                        let { text, isMine } = PrivateKeyStore.decodeMemo(
                            op[1].memo
                        );

                        memo = text ? (
                            <td>{text}</td>
                        ) : !text && isMine ? (
                            <td>
                                <Translate content="transfer.memo_unlock" />
                                &nbsp;
                                <a onClick={this._toggleLock.bind(this)}>
                                    <NewIcon
                                        iconWidth={16}
                                        iconHeight={16}
                                        iconName={"locked"}
                                    />
                                </a>
                            </td>
                        ) : null;
                    }

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.assets.issuer"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].issuer)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.asset_issue"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    style={{ fontWeight: "bold" }}
                                    amount={op[1].asset_to_issue.amount}
                                    asset={op[1].asset_to_issue.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.to"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].issue_to_account)}
                            </td>
                        </tr>
                    );

                    {
                        memo
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate content="transfer.memo" />
                                    </td>
                                    {memo}
                                </tr>
                            )
                            : null;
                    }

                    break;

                // ==========================================================================

                case "asset_burn":
                    color = "cancel";

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].payer)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount_to_burn.amount}
                                    asset={op[1].amount_to_burn.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_fund_fee_pool":
                    color = "warning";
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].from_account)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.title"
                                />
                            </td>
                            <td>{this.linkToAsset(op[1].asset_id)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount}
                                    asset="1.3.0"
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_settle":
                    color = "warning";

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].account)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.title"
                                />
                            </td>
                            <td>{this.linkToAsset(op[1].amount.asset_id)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_publish_feed":
                    color = "warning";
                    let { feed } = op[1];

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.publisher"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].publisher)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.title"
                                />
                            </td>
                            <td>{this.linkToAsset(op[1].asset_id)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.price_feed.maximum_short_squeeze_ratio"
                                />
                            </td>
                            <td>
                                {(
                                    feed.maximum_short_squeeze_ratio / 1000
                                ).toFixed(2)}
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.price_feed.maintenance_collateral_ratio"
                                />
                            </td>
                            <td>
                                {(
                                    feed.maintenance_collateral_ratio / 1000
                                ).toFixed(2)}
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="markets.core_rate"
                                />
                            </td>
                            <td>
                                <FormattedPrice
                                    base_asset={
                                        feed.core_exchange_rate.base.asset_id
                                    }
                                    quote_asset={
                                        feed.core_exchange_rate.quote.asset_id
                                    }
                                    base_amount={
                                        feed.core_exchange_rate.base.amount
                                    }
                                    quote_amount={
                                        feed.core_exchange_rate.quote.amount
                                    }
                                    noPopOver
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.settlement_price"
                                />
                            </td>
                            <td>
                                <FormattedPrice
                                    base_asset={
                                        feed.settlement_price.base.asset_id
                                    }
                                    quote_asset={
                                        feed.settlement_price.quote.asset_id
                                    }
                                    base_amount={
                                        feed.settlement_price.base.amount
                                    }
                                    quote_amount={
                                        feed.settlement_price.quote.amount
                                    }
                                    noPopOver
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "committee_member_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.committee_member.title"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(
                                    op[1].committee_member_account
                                )}
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "witness_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.witness"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].witness_account)}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "witness_update":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.witness"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].witness_account)}</td>
                        </tr>
                    );

                    if (op[1].new_url) {
                        rows.push(
                            <tr key={key++}>
                                <td>
                                    <Translate
                                        component="span"
                                        content="transaction.new_url"
                                    />
                                </td>
                                <td>
                                    <a
                                        href={op[1].new_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {op[1].new_url}
                                    </a>
                                </td>
                            </tr>
                        );
                    }

                    break;

                // ==========================================================================

                case "balance_claim":
                    color = "success";

                    let bal_id = op[1].balance_to_claim.substring(5);

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.claimed"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].total_claimed.amount}
                                    asset={op[1].total_claimed.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.deposit_to"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].deposit_to_account)}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.balance_id"
                                />
                            </td>
                            <td>#{bal_id}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.balance_owner"
                                />
                            </td>
                            <td style={{ fontSize: "80%" }}>
                                {op[1].balance_owner_key.substring(0, 10)}
                                ...
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "vesting_balance_withdraw":
                    color = "success";

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.to"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].owner)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "transfer_to_blind":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.from"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].from)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.blinding_factor"
                                />
                            </td>
                            <td style={{ fontSize: "80%" }}>
                                {op[1].blinding_factor}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.outputs"
                                />
                            </td>
                            <td>
                                <Inspector
                                    data={op[1].outputs[0]}
                                    search={false}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "transfer_from_blind":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.to"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].to)}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.blinding_factor"
                                />
                            </td>
                            <td style={{ fontSize: "80%" }}>
                                {op[1].blinding_factor}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.inputs"
                                />
                            </td>
                            <td>
                                <Inspector
                                    data={op[1].inputs[0]}
                                    search={false}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "blind_transfer":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.inputs"
                                />
                            </td>
                            <td>
                                <Inspector
                                    data={op[1].inputs[0]}
                                    search={false}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.outputs"
                                />
                            </td>
                            <td>
                                <Inspector
                                    data={op[1].outputs[0]}
                                    search={false}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "proposal_create":
                    var expiration_date = new Date(op[1].expiration_time + "Z");
                    var has_review_period =
                        op[1].review_period_seconds !== undefined;
                    var review_begin_time = !has_review_period
                        ? null
                        : expiration_date.getTime() -
                        op[1].review_period_seconds * 1000;
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.review_period"
                                />
                            </td>
                            <td>
                                {has_review_period ? (
                                    <FormattedDate
                                        value={new Date(review_begin_time)}
                                        format="full"
                                    />
                                ) : (
                                    <span>&mdash;</span>
                                )}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.expiration_time"
                                />
                            </td>
                            <td>
                                <FormattedDate
                                    value={expiration_date}
                                    format="full"
                                />
                            </td>
                        </tr>
                    );
                    var operations = [];
                    for (let pop of op[1].proposed_ops) operations.push(pop.op);

                    let proposalsText = op[1].proposed_ops.map((o, index) => {
                        return (
                            <ProposedOperation
                                key={index}
                                index={index}
                                op={o.op}
                                inverted={false}
                                hideFee={true}
                                hideOpLabel={true}
                                hideDate={true}
                                proposal={true}
                            />
                        );
                    });

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.proposed_operations"
                                />
                            </td>
                            <td>{proposalsText}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.fee_paying_account"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].fee_paying_account)}
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "proposal_update":
                    let fields = [
                        "active_approvals_to_add",
                        "active_approvals_to_remove",
                        "owner_approvals_to_add",
                        "owner_approvals_to_remove",
                        "key_approvals_to_add",
                        "key_approvals_to_remove"
                    ];

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.fee_paying_account"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].fee_paying_account)}
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.id"
                                />
                            </td>
                            <td>{op[1].proposal}</td>
                        </tr>
                    );

                    fields.forEach(field => {
                        if (op[1][field].length) {
                            rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            content={`proposal.update.${field}`}
                                        />
                                    </td>
                                    <td>
                                        {op[1][field].map(value => {
                                            return (
                                                <div key={value}>
                                                    {this.linkToAccount(value)}
                                                </div>
                                            );
                                        })}
                                    </td>
                                </tr>
                            );
                        }
                    });

                    break;

                // ==========================================================================

                case "proposal_delete":
                    color = "cancel";
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.fee_paying_account"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].fee_paying_account)}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_delete.using_owner_authority"
                                />
                            </td>
                            <td>
                                <TranslateBoolean
                                    value={op[1].using_owner_authority}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="proposal_create.id"
                                />
                            </td>
                            <td>{op[1].proposal}</td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "asset_claim_fees":
                    color = "success";

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.claimed"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount_to_claim.amount}
                                    asset={op[1].amount_to_claim.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.deposit_to"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].issuer)}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "asset_reserve":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="modal.reserve.from"
                                />
                            </td>
                            <td>{this.linkToAccount(op[1].payer)}</td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.title"
                                />
                            </td>
                            <td>
                                {this.linkToAsset(
                                    op[1].amount_to_reserve.asset_id
                                )}
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount_to_reserve.amount}
                                    asset={op[1].amount_to_reserve.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "worker_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.workers.title"
                                />
                            </td>
                            <td>{op[1].name}</td>
                        </tr>
                    );

                    let startDate = counterpart.localize(
                        new Date(op[1].work_begin_date),
                        { type: "date" }
                    );
                    let endDate = counterpart.localize(
                        new Date(op[1].work_end_date),
                        { type: "date" }
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.workers.period"
                                />
                            </td>
                            <td>
                                {startDate} - {endDate}
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.workers.daily_pay"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].daily_pay}
                                    asset="1.3.0"
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.workers.website"
                                />
                            </td>
                            <td>{op[1].url}</td>
                        </tr>
                    );

                    if (op[1].initializer[1]) {
                        rows.push(
                            <tr key={key++}>
                                <td>
                                    <Translate
                                        component="span"
                                        content="explorer.workers.vesting_pay"
                                    />
                                </td>
                                <td>
                                    {
                                        op[1].initializer[1]
                                            .pay_vesting_period_days
                                    }
                                </td>
                            </tr>
                        );
                    }

                    break;

                // ==========================================================================

                case "asset_claim_pool":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="account.name"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].issuer} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.title"
                                />
                            </td>
                            <td>
                                <LinkToAssetById asset={op[1].asset_id} />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount_to_claim.amount}
                                    asset={op[1].amount_to_claim.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "asset_update_issuer":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.from"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].issuer} />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.to"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].new_issuer} />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.title"
                                />
                            </td>
                            <td>
                                <LinkToAssetById
                                    asset={op[1].asset_to_update}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "bid_collateral":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].bidder} />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.collateral_bid.collateral"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    asset={op[1].additional_collateral.asset_id}
                                    amount={op[1].additional_collateral.amount}
                                />
                            </td>
                        </tr>
                    );

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.asset.collateral_bid.debt"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    asset={op[1].debt_covered.asset_id}
                                    amount={op[1].debt_covered.amount}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "account_status_upgrade":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.account_upgrade"
                                />
                            </td>
                            <td>
                                {this.linkToAccount(op[1].account_to_upgrade)}
                            </td>
                        </tr>
                    );
                    {
                        op[1].referral_status_type == 1
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="explorer.block.new_contract"
                                        />
                                    </td>
                                    <td>Start</td>
                                </tr>
                            )
                            : null;
                    }
                    {
                        op[1].referral_status_type == 2
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="explorer.block.new_contract"
                                        />
                                    </td>
                                    <td>Expert</td>
                                </tr>
                            )
                            : null;
                    }
                    {
                        op[1].referral_status_type == 3
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="explorer.block.new_contract"
                                        />
                                    </td>
                                    <td>Citizen</td>
                                </tr>
                            )
                            : null;
                    }
                    {
                        op[1].referral_status_type == 4
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate
                                            component="span"
                                            content="explorer.block.new_contract"
                                        />
                                    </td>
                                    <td>Infinity</td>
                                </tr>
                            )
                            : null;
                    }
                    break;

                // ==========================================================================

                case "flipcoin_bet":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].bettor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.bet_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset amount={op[1].bet.amount} />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "flipcoin_call":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].caller} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.bet_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset amount={op[1].bet.amount} />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "lottery_goods_create_lot":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].owner} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.lot_create"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].ticket_price.amount}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "lottery_goods_buy_ticket":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].participant}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.lottery_ticket_price"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].ticket_price.amount}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "lottery_goods_send_contacts":
                    if (op[1].winner_contacts) {
                        let { text, isMine } = PrivateKeyStore.decodeMemo(
                            op[1].winner_contacts
                        );

                        memo = text ? (
                            <td
                                className="memo"
                                style={{ wordBreak: "break-all" }}
                            >
                                {text}
                            </td>
                        ) : !text && isMine ? (
                            <td>
                                <Translate content="transfer.memo_unlock" />
                                &nbsp;
                                <a onClick={this._toggleLock.bind(this)}>
                                    <NewIcon
                                        iconWidth={16}
                                        iconHeight={16}
                                        iconName={"locked"}
                                    />
                                </a>
                            </td>
                        ) : null;
                    }
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].winner} />
                            </td>
                        </tr>
                    );
                    {
                        memo
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate content="transfer.memo" />
                                    </td>
                                    {memo}
                                </tr>
                            )
                            : null;
                    }

                    break;

                // ==========================================================================

                case "lottery_goods_confirm_delivery":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].winner} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.lot_num"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].lot_id.lottery_goods}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "matrix_open_room":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.account.title"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].player} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.matrix_id"
                                />
                            </td>
                            <td>{op[1].matrix_id}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.matrix_level"
                                />
                            </td>
                            <td>{op[1].matrix_level}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.matrix_price"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].level_price.amount}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "create_p2p_adv":
                    price = parseFloat(op[1].price / 100000000)
                        .toFixed(8)
                        .toString()
                        .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].p2p_gateway}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.adv_type"
                                />
                            </td>
                            <td>
                                {op[1].adv_type ? (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.adv_type_sell"
                                    />
                                ) : (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.adv_type_buy"
                                    />
                                )}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.adv_description"
                                />
                            </td>
                            <td>{op[1].adv_description}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.min_cwd"
                                />
                            </td>
                            <td>
                                <FormattedAsset amount={op[1].min_cwd} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.max_cwd"
                                />
                            </td>
                            <td>
                                <FormattedAsset amount={op[1].max_cwd} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.price"
                                />
                            </td>
                            <td>{price}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.currency"
                                />
                            </td>
                            <td>{op[1].currency}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.min_p2p_complete_deals"
                                />
                            </td>
                            <td>{op[1].min_p2p_complete_deals}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.min_account_status"
                                />
                            </td>
                            <td>{op[1].min_account_status}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.timelimit_for_reply"
                                />
                            </td>
                            <td>{op[1].timelimit_for_reply / 60}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.timelimit_for_approve"
                                />
                            </td>
                            <td>{op[1].timelimit_for_approve / 60}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>Geo</td>
                            <td>{op[1].geo}</td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "edit_p2p_adv":
                    price =
                        parseFloat(op[1].price) /
                        (100000000)
                            .toFixed(8)
                            .toString()
                            .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.adv_type"
                                />
                            </td>
                            <td>
                                {op[1].status ? (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.status_active"
                                    />
                                ) : (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.status_inactive"
                                    />
                                )}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].p2p_gateway}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.adv_type"
                                />
                            </td>
                            <td>
                                {op[1].adv_type ? (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.adv_type_sell"
                                    />
                                ) : (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.adv_type_buy"
                                    />
                                )}
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.adv_description"
                                />
                            </td>
                            <td>{op[1].adv_description}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.min_cwd"
                                />
                            </td>
                            <td>
                                <FormattedAsset amount={op[1].min_cwd} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.max_cwd"
                                />
                            </td>
                            <td>
                                <FormattedAsset amount={op[1].max_cwd} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.price"
                                />
                            </td>
                            <td>{price}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.currency"
                                />
                            </td>
                            <td>{op[1].currency}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.min_p2p_complete_deals"
                                />
                            </td>
                            <td>{op[1].min_p2p_complete_deals}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.min_account_status"
                                />
                            </td>
                            <td>{op[1].min_account_status}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.timelimit_for_reply"
                                />
                            </td>
                            <td>{op[1].timelimit_for_reply / 60}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.timelimit_for_approve"
                                />
                            </td>
                            <td>{op[1].timelimit_for_approve / 60}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>Geo</td>
                            <td>{op[1].geo}</td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "create_p2p_order":
                    price = parseFloat(op[1].price / 100000000)
                        .toFixed(8)
                        .toString()
                        .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_adv"
                                />
                            </td>
                            <td>{op[1].p2p_adv}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.quantity"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.price"
                                />
                            </td>
                            <td>{price}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].p2p_gateway}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_client"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].p2p_client} />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "cancel_p2p_order":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].p2p_gateway}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_client"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].p2p_client} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_order"
                                />
                            </td>
                            <td>{op[1].p2p_order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.blacklist"
                                />
                            </td>
                            <td>
                                {op[1].blacklist ? (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.blacklist_true"
                                    />
                                ) : (
                                    <Translate
                                        component="span"
                                        content="transaction.trxTypes.p2p_ops.blacklist_false"
                                    />
                                )}
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "call_p2p_order":
                    price = parseFloat(op[1].price / 100000000)
                        .toFixed(8)
                        .toString()
                        .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_order"
                                />
                            </td>
                            <td>{op[1].p2p_order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.quantity"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.price"
                                />
                            </td>
                            <td>{price}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].p2p_gateway}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_client"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].p2p_client} />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "payment_p2p_order":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_order"
                                />
                            </td>
                            <td>{op[1].p2p_order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].recieving_account}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_client"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].paying_account}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "release_p2p_order":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_order"
                                />
                            </td>
                            <td>{op[1].p2p_order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].recieving_account}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_client"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].paying_account}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "open_p2p_dispute":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_order"
                                />
                            </td>
                            <td>{op[1].p2p_order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.applicant"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.defendant"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].defendant} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.arbitr"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].arbitr} />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "reply_p2p_dispute":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_order"
                                />
                            </td>
                            <td>{op[1].p2p_order}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.reply_disput"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.arbitr"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].arbitr} />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "remove_from_p2p_adv_black_list":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.p2p_adv"
                                />
                            </td>
                            <td>{op[1].p2p_adv}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.trader"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].p2p_gateway}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.p2p_ops.black_acc"
                                />
                            </td>
                            <td>
                                <LinkToAccountById
                                    account={op[1].blacklisted}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "send_message":
                    color = "success";

                    if (op[1].memo) {
                        let { text, isMine } = PrivateKeyStore.decodeMemo(
                            op[1].memo
                        );

                        memo = text ? (
                            <td
                                className="memo"
                                style={{ wordBreak: "break-all" }}
                            >
                                {text}
                            </td>
                        ) : !text && isMine ? (
                            <td>
                                <Translate content="transfer.memo_unlock" />
                                &nbsp;
                                <a onClick={this._toggleLock.bind(this)}>
                                    <NewIcon
                                        iconWidth={16}
                                        iconHeight={16}
                                        iconName={"locked"}
                                    />
                                </a>
                            </td>
                        ) : null;
                    }

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.from"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].from} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transfer.to"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].to} />
                            </td>
                        </tr>
                    );
                    {
                        memo
                            ? rows.push(
                                <tr key={key++}>
                                    <td>
                                        <Translate content="transfer.memo" />
                                    </td>
                                    {memo}
                                </tr>
                            )
                            : null;
                    }

                    break;

                // ==========================================================================

                //CREDIT OPS
                case "credit_system_get":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.debitor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].debitor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].credit_amount.amount}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "credit_repay":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.debitor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].debitor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.repay_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].repay_amount.amount}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "credit_offer_create":
                    min_income = parseFloat(op[1].min_income / 100000000)
                        .toFixed(8)
                        .toString()
                        .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].credit_amount.amount}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.repay_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].repay_amount.amount}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.min_income"
                                />
                            </td>
                            <td>{min_income}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "credit_offer_cancel":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LLinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_offer"
                                />
                            </td>
                            <td>{op[1].credit_offer}</td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "credit_offer_fill":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.debitor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].debitor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].credit_amount.amount}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_offer"
                                />
                            </td>
                            <td>{op[1].credit_offer}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "pledge_offer_give_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].pledge_amount.amount}
                                    asset={op[1].pledge_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].credit_amount.amount}
                                    asset={op[1].credit_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.repay_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].repay_amount.amount}
                                    asset={op[1].repay_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_days"
                                />
                            </td>
                            <td>{op[1].pledge_days}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "pledge_offer_take_create":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.debitor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].debitor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].pledge_amount.amount}
                                    asset={op[1].pledge_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].credit_amount.amount}
                                    asset={op[1].credit_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.repay_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].repay_amount.amount}
                                    asset={op[1].repay_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_days"
                                />
                            </td>
                            <td>{op[1].pledge_days}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "pledge_offer_cancel":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creator"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creator} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_offer"
                                />
                            </td>
                            <td>{op[1].pledge_offer}</td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "pledge_offer_fill":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.debitor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].debitor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.credit_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].credit_amount.amount}
                                    asset={op[1].credit_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].pledge_amount.amount}
                                    asset={op[1].pledge_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.repay_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].repay_amount.amount}
                                    asset={op[1].repay_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_days"
                                />
                            </td>
                            <td>{op[1].pledge_days}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "pledge_offer_repay":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.debitor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].debitor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.creditor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].creditor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.repay_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].repay_amount.amount}
                                    asset={op[1].repay_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_offer"
                                />
                            </td>
                            <td>{op[1].pledge_offer}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.credit_ops.pledge_amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].pledge_amount.amount}
                                    asset={op[1].pledge_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "poc_vote":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.account"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.poc_vote_ops.poc3_vote"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].poc3_vote.amount}
                                    asset={op[1].poc3_vote.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.poc_vote_ops.poc6_vote"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].poc6_vote.amount}
                                    asset={op[1].poc6_vote.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.poc_vote_ops.poc12_vote"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].poc12_vote.amount}
                                    asset={op[1].poc12_vote.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                case "exchange_silver":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.account"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "poc_stak":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.account"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].stak_amount.amount}
                                    asset={op[1].stak_amount.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.poc_stak_ops.staking_type"
                                />
                            </td>
                            <td>
                                {op[1].staking_type}&nbsp;
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.poc_stak_ops.months"
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "buy_gcwd":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.account"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.amount"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].amount.amount}
                                    asset={op[1].amount.asset_id}
                                />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "change_referrer":
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.account"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].account_id} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.new_referrer"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].new_referrer} />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_team_create":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].captain} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].name}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.description"
                                />
                            </td>
                            <td>{op[1].description}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_team_delete":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].captain} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].team}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_invite_send":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].captain} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.player"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].player} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].team}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_invite_accept":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].captain} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.player"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].player} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].team}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_player_remove":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].captain} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.player"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].player} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].team}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_team_leave":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].captain} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.player"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].player} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].team}</td>
                        </tr>
                    );

                    break;
                // ==========================================================================

                case "gr_vote":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.captain"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].player} />
                            </td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_range_bet":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.bettor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].bettor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.bet"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].bet.amount}
                                    asset={op[1].bet.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.great_race.team"
                                />
                            </td>
                            <td>{op[1].team}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.result"
                                />
                            </td>
                            <td>{op[1].result ?
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.result_true"
                                />
                                :
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.result_false"
                                />
                            }</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.lower_rank"
                                />
                            </td>
                            <td>{op[1].lower_rank}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.upper_rank"
                                />
                            </td>
                            <td>{op[1].upper_rank}</td>
                        </tr>
                    );

                    break;

                // ==========================================================================

                case "gr_team_bet":

                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.bettor"
                                />
                            </td>
                            <td>
                                <LinkToAccountById account={op[1].bettor} />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.bet"
                                />
                            </td>
                            <td>
                                <FormattedAsset
                                    amount={op[1].bet.amount}
                                    asset={op[1].bet.asset_id}
                                />
                            </td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.team1"
                                />
                            </td>
                            <td>{op[1].team1}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.team2"
                                />
                            </td>
                            <td>{op[1].team2}</td>
                        </tr>
                    );
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="transaction.trxTypes.gr_bets.winner"
                                />
                            </td>
                            <td>{op[1].winner}</td>
                        </tr>
                    );
                    break;

                // ==========================================================================

                default:
                    rows.push(
                        <tr key={key++}>
                            <td>
                                <Translate
                                    component="span"
                                    content="explorer.block.op"
                                />
                            </td>
                            <td>
                                <Inspector data={op} search={false} />
                            </td>
                        </tr>
                    );
                    break;
            }

            info.push(
                <OperationTable
                    txIndex={this.props.index}
                    key={opIndex}
                    opCount={opCount}
                    index={opIndex}
                    color={color}
                    type={op[0]}
                    fee={op[1].fee}
                >
                    {rows}
                </OperationTable>
            );
        });

        return <div>{info}</div>;
    }
}

Transaction.defaultProps = {
    no_links: false
};

Transaction.propTypes = {
    trx: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    no_links: PropTypes.bool
};

export default Transaction;
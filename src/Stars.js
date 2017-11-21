import React, { Component } from 'react';
import _ from 'lodash';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import './Stars.css';

let STAR_COUNTER = 0;
const MAX_STARS_AMOUNT = 4;
const STAR_SHOW_INTERVAL = 400;
const BACKGROUND_STARS_TOTAL = 30;
const COLORS = ['#FF5130', '#A496FF', '#5CFF80'];

class Stars extends Component {
  constructor() {
    super();

    this.state = {
      stars: [],
      backgroundStars: [],
    };
  }

  componentDidMount() {
    setInterval(() => this.addStar(this.props.colors), STAR_SHOW_INTERVAL);
    this.setState({
      backgroundStars: this.generateStars(this.props.colors),
    });
  }

  generateStars = (colors) => {
    return [...Array(BACKGROUND_STARS_TOTAL)].map((index) => {
      return {
        id: index,
        top: this.randomNumber(0, window.innerHeight),
        left: this.randomNumber(0, window.innerWidth),
        background: colors[this.randomNumber(0, colors.length)],
      };
    });
  }

  addStar = (colors) => {
    let { stars } = this.state;

    stars.push({
      id: STAR_COUNTER,
      top: this.randomNumber(0, window.innerHeight),
      left: this.randomNumber(0, window.innerWidth),
      background: colors[this.randomNumber(0, colors.length)],
    });

    let newStars = stars.length > MAX_STARS_AMOUNT ? stars.slice(1, stars.length) : stars;
    this.setState({ stars: newStars });
    STAR_COUNTER++;
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  render() {
    return (
      <div id="stars">
        {/* { this.state.backgroundStars.map((backgroundStar, index) => {
          return (
            <div
            key={ index }
            className="star"
            style={{
              zIndex: this.props.zIndex,
              top: backgroundStar.top,
              left: backgroundStar.left,
              background: backgroundStar.background,
            }} />
          );
        }) } */}

        <CSSTransitionGroup
        transitionName="star"
        transitionEnterTimeout={2000}
        transitionLeaveTimeout={2000}>
          { this.state.stars.map((star, index) => {
            return (
              <div
              key={ star.id }
              className="star"
              style={{
                zIndex: this.props.zIndex,
                top: star.top,
                left: star.left,
                background: star.background,
              }} />
            );
          }) }
        </CSSTransitionGroup>
      </div>
    );
  }
}

export default Stars;

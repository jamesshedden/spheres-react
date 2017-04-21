import React, { Component } from 'react';
import _ from 'lodash';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import './Stars.css';

let STAR_COUNTER = 0;
const MAX_STARS_AMOUNT = 2;
const STAR_SHOW_INTERVAL = 300;
const COLORS = ['#FF9E9E', '#9EFFC6', '#9EEFFF', '#D8CEFF', '#B6FF9E'];

class Stars extends Component {
  constructor() {
    super();

    this.state = {
      stars: [],
    };
  }

  componentDidMount() {
    setInterval(this.addStar, STAR_SHOW_INTERVAL);
  }

  addStar = () => {
    let { stars } = this.state;

    stars.push({
      id: STAR_COUNTER,
      top: this.randomNumber(0, window.innerHeight),
      left: this.randomNumber(0, window.innerWidth),
      scale: this.randomNumber(0.9, 1.1),
    });

    let newStars = stars.length > MAX_STARS_AMOUNT ? stars.slice(1, stars.length) : stars;
    this.setState({ stars: newStars });
    STAR_COUNTER++;
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  render() {
    return (
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
              width: '3px',
              height: '3px',
              top: star.top,
              left: star.left,
              background: COLORS[this.randomNumber(0, COLORS.length)],
              // transform: `scale(${ star.scale })`,
              borderRadius: '50%',
            }} />
          );
        }) }
      </CSSTransitionGroup>
    );
  }
}

export default Stars;

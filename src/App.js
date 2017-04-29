import React, { Component } from 'react';
import _ from 'lodash';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import Stars from './Stars';
import './App.css';

const MAX_CIRCLE_AMOUNT = 10;
const PARALLAX_AMOUNT_DIVISOR = 80;

const COLORS = ['#FF9E9E', '#9EFFC6', '#9EEFFF', '#D8CEFF', '#B6FF9E'];

class App extends Component {
  constructor() {
    super();

    this.state = {
      circles: [],
      backgroundColor1: 'FEB522',
      backgroundColor2: 'A1FFFC',
      startedDraggingAt: 0,
      isDragging: false,
      activeCircle: null,
      stars: [],
      showDiv: false,
      circleElements: [],
      sphereCount: 0,
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.throttledWindowResize); // TODO: remove event listener on unmount
  }

  throttledWindowResize = () => {
    _.throttle(this.onWindowResize, 10)();
  }

  onWindowResize = () => {
    const circles = _.map(this.state.circles, (circle) => {
      return _.assign({}, circle, {
        top: (window.innerHeight / 100) * circle.distanceAsPercent.top,
        left: (window.innerWidth / 100) * circle.distanceAsPercent.left,
      });
    })

    this.setState({ circles });
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  getPointerCoordinatesFromCentre = (positionX, positionY) => {
    return {
      x: (window.innerWidth / 2) - positionX,
      y: (window.innerHeight / 2) - positionY,
    };
  }

  roundToTwo = (input) => _.round(input, 2);

  getTranslateAmountsFromCoordinates = (coordinates, multiplierFromZero, divisor) => {
    // multiplier comes from the counter, or the array index of a circle element, so
    // will sometimes be 0 or 1 but we don't want to multiply by these
    const MULTIPLIER_BUFFER = 2;

    const multiplier = multiplierFromZero + MULTIPLIER_BUFFER

    const translateX = this.roundToTwo(
      (coordinates.x * (multiplier)) / divisor
    )

    const translateY = this.roundToTwo(
      (coordinates.y * (multiplier)) / divisor
    )

    return {
      translateX,
      translateY,
    };
  }

  makeCircle = (event) => {
    const randomDimension = this.randomNumber(100, 250);

    const multiplierForTranslateAmounts = this.state.sphereCount > MAX_CIRCLE_AMOUNT ?
      MAX_CIRCLE_AMOUNT : this.state.sphereCount;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(event.pageX, event.pageY),
      multiplierForTranslateAmounts,
      PARALLAX_AMOUNT_DIVISOR,
    );

    let background = `
      linear-gradient(45deg, #523191 0%, ${ COLORS[this.randomNumber(0, COLORS.length)] } 100%)
    `;

    let circles = this.state.circles;

    let top = event.pageY - translateY - (randomDimension / 2);
    let left = event.pageX - translateX - (randomDimension / 2);

    circles.push({
      id: this.state.sphereCount,
      background,
      width: randomDimension,
      height: randomDimension,
      distanceAsPercent: {
        top: (top * 100) / window.innerHeight,
        left: (left * 100) / window.innerWidth,
      },
      top,
      left,
      translateX,
      translateY,
    });

    circles = circles.length > MAX_CIRCLE_AMOUNT ? circles.slice(1, circles.length) : circles;

    const arrayOfIndexes = _.map([...Array(circles.length)], (_, index) => {
      return { index };
    });

    const newCircles = _.merge([], circles, arrayOfIndexes);

    const circleElements = document.getElementsByClassName('circle');

    this.setState({
      circles: newCircles,
      circleElements,
      sphereCount: this.state.sphereCount + 1,
    });
  };

  transformCircles = (circles, x, y) => {
    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(x, y),
        index,
        PARALLAX_AMOUNT_DIVISOR,
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  sphereDrag = (pageX, pageY, width) => {
    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      this.state.activeCircle.index,
      PARALLAX_AMOUNT_DIVISOR,
    );

    let { top, left } = this.getPosition(
      pageX,
      pageY,
      translateX,
      translateY,
      width
    );

    return {
      top,
      left,
      translateX,
      translateY
    }
  }

  transformActiveCircle = (pageX, pageY) => {
    let activeCircleIndex = _.findIndex(this.state.circles, { id: this.state.activeCircle.id });

    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY, this.state.circles[activeCircleIndex].width);

    let distanceAsPercent = {
      top: (top * 100) / window.innerHeight,
      left: (left * 100) / window.innerWidth,
    };

    let newCircles = this.state.circles;

    newCircles[activeCircleIndex] = _.assign({}, newCircles[activeCircleIndex], {
      distanceAsPercent,
      top,
      left,
      translateX,
      translateY,
    });

    this.setState({ circles: newCircles });
  }

  getPosition = (pageX, pageY, translateX, translateY, dimension) => {
    const { pointerDistanceFromCircleCentre } = this.state.activeCircle;

    const top = this.roundToTwo(
      pageY - translateY - (dimension / 2) - pointerDistanceFromCircleCentre.y
    );

    const left = this.roundToTwo(
      pageX - translateX - (dimension / 2) - pointerDistanceFromCircleCentre.x
    );

    return {
      top,
      left,
    };
  }

  moveActiveCircle = (element, pageX, pageY) => {
    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY, element.offsetWidth);

    element.style.top = `${ top }px`;
    element.style.left = `${ left }px`;
    element.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`
  }

  onMouseMove = (event) => {
    const { pageX, pageY } = event;

    if (this.state.circleElements.length) {
      this.transformCircles(this.state.circleElements, pageX, pageY);
    }

    if (this.state.activeCircle) {
      this.moveActiveCircle(this.state.activeCircle.element, pageX, pageY);
    }
  }

  onMouseDown = (event) => {
    if (!_.includes(event.target.classList, 'circle')) {
      this.setState({ activeCircle: null });
    }
  }

  throttledMouseMove = (event) => {
    event.persist();
    _.throttle(this.onMouseMove.bind(this, event), 20)();
  }

  onMouseUp = (event) => {
    if (this.state.activeCircle && event.timeStamp - this.state.activeCircle.activeAt > 200) {
      this.transformActiveCircle(event.pageX, event.pageY);
      this.setState({ activeCircle: null });
    } else {
      this.makeCircle(event);
      this.setState({ activeCircle: null });
    };
  }

  render() {
    return (
      <div id="content" className="content"
      onMouseMove={ this.throttledMouseMove }
      onMouseDown={ this.onMouseDown }
      onMouseUp={ this.onMouseUp }
      >
        <div className="content__overlay"></div>

        <CSSTransitionGroup
        transitionName="example"
        transitionEnterTimeout={200}
        transitionLeaveTimeout={1000}>
          { this.state.circles.map((circle, index) => {
            return (
              <div className="circle"
              id={ `circle-${ circle.id }` }
              key={ circle.id }
              onMouseDown={ (event) => {
                const { pageX, pageY } = event;

                const {
                  translateX,
                  translateY,
                  id,
                  index,
                  left,
                  top,
                  width,
                  height,
                } = circle;

                let activeCircleCentreCoordinates = {
                  x: left + (width / 2),
                  y: top + (height / 2),
                }

                let pointerDistanceFromCircleCentre = {
                  x: pageX - translateX - activeCircleCentreCoordinates.x,
                  y: pageY - translateY - activeCircleCentreCoordinates.y,
                }

                this.setState({
                  activeCircle: {
                    id,
                    index,
                    element: event.target,
                    activeAt: event.timeStamp,
                    pointerDistanceFromCircleCentre,
                  },
                });
              }}
              style={ {
                background: circle.background,
                transform: `translateX(${ circle.translateX }px) translateY(${ circle.translateY }px)`,
                top: `${ circle.top }px`,
                left: `${ circle.left }px`,
                width: circle.width,
                height: circle.height,
              } }>
                {/* <div style={{background: 'white', flex: '1 1 auto', fontSize: '15px', fontWeight: 'bold'}}>
                  {circle.id}
                </div> */}

                {/* <div className="circle__inner" style={ {
                  opacity: ((11 - index) / 10) / 4,
                  background: '#A1FFFC',
                } } /> */}
              </div>
            );
          }) }
        </CSSTransitionGroup>

        <Stars key={ 1 } />
        <Stars key={ 2 } />
        <Stars key={ 3 } />
        <Stars key={ 4 } />
      </div>
    );
  }
}

export default App;
